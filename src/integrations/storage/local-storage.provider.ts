import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { StorageProvider } from "./storage-provider.interface";

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly basePath: string;

  constructor(private readonly configService: ConfigService) {
    this.basePath = path.resolve(
      this.configService.get<string>("app.uploadDest", "./uploads"),
    );
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  async upload(
    filePath: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const fullPath = this.resolveStoragePath(filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, buffer);
    this.logger.log(`Uploaded file to ${filePath} (${mimeType})`);
    return filePath;
  }

  async download(filePath: string): Promise<Buffer> {
    const fullPath = this.resolveStoragePath(filePath);
    return fs.readFileSync(fullPath);
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = this.resolveStoragePath(filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  async getSignedUrl(
    filePath: string,
    expiresInSec: number = 3600,
  ): Promise<string> {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSec;
    const signature = this.signFilePath(filePath, expiresAt);
    const apiPrefix = this.configService.get<string>("app.apiPrefix", "api/v1");
    const normalizedPrefix = apiPrefix.replace(/^\/+|\/+$/g, "");

    return `/${normalizedPrefix}/files?path=${encodeURIComponent(filePath)}&expires=${expiresAt}&signature=${signature}`;
  }

  isSignedUrlValid(
    filePath: string,
    expiresAt: number,
    signature: string,
  ): boolean {
    if (expiresAt < Math.floor(Date.now() / 1000)) {
      return false;
    }

    const expectedSignature = this.signFilePath(filePath, expiresAt);
    const providedSignature = Buffer.from(signature, "hex");
    const expectedSignatureBuffer = Buffer.from(expectedSignature, "hex");

    return (
      providedSignature.length === expectedSignatureBuffer.length &&
      timingSafeEqual(providedSignature, expectedSignatureBuffer)
    );
  }

  private resolveStoragePath(filePath: string): string {
    const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, "");
    const fullPath = path.resolve(this.basePath, normalizedPath);

    if (
      fullPath !== this.basePath &&
      !fullPath.startsWith(`${this.basePath}${path.sep}`)
    ) {
      throw new Error("Invalid storage path");
    }

    return fullPath;
  }

  private signFilePath(filePath: string, expiresAt: number): string {
    const secret =
      this.configService.get<string>("auth.fieldEncryptionKey") ||
      this.configService.get<string>("auth.jwtAccessSecret") ||
      "local-file-access-secret";

    return createHmac("sha256", secret)
      .update(`${filePath}:${expiresAt}`)
      .digest("hex");
  }
}
