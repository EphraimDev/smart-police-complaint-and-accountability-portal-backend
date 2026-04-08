import { ConfigService } from "@nestjs/config";
import { Request, Response } from "express";
import { PayloadEncryptionService } from "./payload-encryption.service";

describe("PayloadEncryptionService", () => {
  const encryptionKey = "payload-encryption-secret-that-is-long-enough";

  function createService(enabled: boolean): PayloadEncryptionService {
    const values = {
      "app.payloadEncryptionEnabled": enabled,
      "app.payloadEncryptionKey": encryptionKey,
    };

    const configService = {
      get<T>(key: string, defaultValue?: T): T {
        return (values[key as keyof typeof values] ?? defaultValue) as T;
      },
    } as ConfigService;

    return new PayloadEncryptionService(configService);
  }

  function createRequest(
    overrides: Partial<Request> = {},
  ): Request {
    return {
      method: "POST",
      originalUrl: "/api/v1/auth/login",
      headers: {
        "content-type": "application/json",
      },
      ...overrides,
    } as Request;
  }

  function createResponse(): Response {
    const headers = new Map<string, string>();

    return {
      getHeader(name: string): string | undefined {
        return headers.get(name);
      },
      setHeader(name: string, value: string): Response {
        headers.set(name, value);
        return this;
      },
    } as Response;
  }

  it("round-trips encrypted JSON payloads when enabled", () => {
    const service = createService(true);
    const request = createRequest();
    const response = createResponse();
    const requestPayload = (service as unknown as {
      encrypt: (plaintext: string, aad: Buffer) => string;
      buildAad: (req: Request, direction: "request" | "response") => Buffer;
    }).encrypt(
      JSON.stringify({ email: "user@example.com", password: "secret" }),
      (service as unknown as {
        buildAad: (req: Request, direction: "request" | "response") => Buffer;
      }).buildAad(request, "request"),
    );

    const envelope = service.createEncryptedResponseEnvelope(
      { success: true, message: "ok", data: { id: 1 } },
      request,
      response,
    );

    const decrypted = service.decryptRequestBody(
      { payload: requestPayload },
      createRequest({ originalUrl: "/api/v1/auth/login" }),
    ) as Record<string, unknown>;

    expect(envelope.encrypted).toBe(true);
    expect(envelope).not.toHaveProperty("algorithm");
    expect(decrypted.email).toBe("user@example.com");
    expect(decrypted.password).toBe("secret");
  });

  it("does not require encryption when disabled", () => {
    const service = createService(false);
    const request = createRequest();

    expect(service.shouldDecryptRequest(request)).toBe(false);
    expect(service.shouldEncryptResponse(request, createResponse(), {})).toBe(
      false,
    );
  });

  it("rejects malformed encrypted request payloads", () => {
    const service = createService(true);

    expect(() =>
      service.decryptRequestBody({ payload: "invalid" }, createRequest()),
    ).toThrow("Unable to decrypt request payload.");
  });
});
