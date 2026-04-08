import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request, Response } from "express";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

export interface EncryptedPayloadEnvelope {
  encrypted: true;
  payload: string;
}

@Injectable()
export class PayloadEncryptionService {
  private readonly enabled: boolean;
  private readonly key?: Buffer;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>(
      "app.payloadEncryptionEnabled",
      false,
    );

    const secret = this.configService.get<string>(
      "app.payloadEncryptionKey",
      "",
    );
    if (this.enabled) {
      this.key = createHash("sha256").update(secret, "utf8").digest();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  shouldDecryptRequest(request: Request): boolean {
    if (!this.enabled) {
      return false;
    }

    if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
      return false;
    }

    return this.isJsonRequest(request);
  }

  shouldEncryptResponse(
    request: Request,
    response: Response,
    body: unknown,
  ): boolean {
    if (!this.enabled) {
      return false;
    }

    if (request.method.toUpperCase() === "HEAD") {
      return false;
    }

    if (Buffer.isBuffer(body)) {
      return false;
    }

    const contentTypeHeader = response.getHeader("Content-Type");
    const contentType =
      typeof contentTypeHeader === "string"
        ? contentTypeHeader
        : Array.isArray(contentTypeHeader)
          ? contentTypeHeader.join(",")
          : "";

    if (contentType && !contentType.includes("application/json")) {
      return false;
    }

    return true;
  }

  decryptRequestBody(body: unknown, request: Request): unknown {
    if (!this.enabled) {
      return body;
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new BadRequestException(
        "Encrypted requests must use a JSON object body containing a payload field.",
      );
    }

    const payload = (body as Record<string, unknown>).payload;
    if (typeof payload !== "string" || payload.length === 0) {
      throw new BadRequestException(
        "Encrypted request payload is missing or invalid.",
      );
    }

    try {
      const plaintext = this.decrypt(
        payload,
        this.buildAad(request, "request"),
      );
      return JSON.parse(plaintext) as unknown;
    } catch (error) {
      throw new BadRequestException("Unable to decrypt request payload.", {
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  createEncryptedResponseEnvelope(
    body: unknown,
    request: Request,
    response: Response,
  ): EncryptedPayloadEnvelope {
    if (!this.enabled) {
      throw new InternalServerErrorException(
        "Payload encryption is disabled for this environment.",
      );
    }

    const plaintext = JSON.stringify(body);
    const payload = this.encrypt(plaintext, this.buildAad(request, "response"));

    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("x-payload-encrypted", "true");

    return {
      encrypted: true,
      payload,
    };
  }

  private isJsonRequest(request: Request): boolean {
    const contentType = request.headers["content-type"];
    if (typeof contentType !== "string") {
      return false;
    }

    return contentType.includes("application/json");
  }

  private buildAad(
    request: Request,
    direction: "request" | "response",
  ): Buffer {
    return Buffer.from(
      JSON.stringify({
        direction,
        method: request.method.toUpperCase(),
        path: request.originalUrl.split("?")[0],
      }),
      "utf8",
    );
  }

  private encrypt(plaintext: string, aad: Buffer): string {
    const key = this.getRequiredKey();
    const iv = randomBytes(
      this.configService.get<number>("app.payloadEncryptionIVLength")!,
    );
    const cipher = createCipheriv(
      this.configService.get<string>("app.payloadEncryptionAlgorithm")!,
      key,
      iv,
    ) as any;
    cipher.setAAD(aad);

    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [iv, tag, ciphertext]
      .map((value) => value.toString("base64url"))
      .join(this.configService.get<string>("app.encryptedPayloadSeparator")!);
  }

  private decrypt(payload: string, aad: Buffer): string {
    const key = this.getRequiredKey();
    const [ivSegment, tagSegment, ciphertextSegment] = payload.split(
      this.configService.get<string>("app.encryptedPayloadSeparator")!,
    );

    if (!ivSegment || !tagSegment || !ciphertextSegment) {
      throw new Error("Encrypted payload format is invalid.");
    }

    const iv = Buffer.from(ivSegment, "base64url");
    const tag = Buffer.from(tagSegment, "base64url");
    const ciphertext = Buffer.from(ciphertextSegment, "base64url");

    if (
      iv.length !==
        this.configService.get<number>("app.payloadEncryptionIVLength")! ||
      tag.length !==
        this.configService.get<number>("app.payloadEncryptionTagLength")!
    ) {
      throw new Error("Encrypted payload metadata is invalid.");
    }

    const decipher = createDecipheriv(
      this.configService.get<string>("app.payloadEncryptionAlgorithm")!,
      key,
      iv,
    ) as any;
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  }

  private getRequiredKey(): Buffer {
    if (!this.key) {
      throw new Error("Payload encryption key is not configured.");
    }

    return this.key;
  }
}
