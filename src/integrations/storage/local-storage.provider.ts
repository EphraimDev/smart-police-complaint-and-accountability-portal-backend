import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { StorageProvider } from "./storage-provider.interface";

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly basePath = path.join(process.cwd(), "uploads");

  constructor() {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  async upload(
    filePath: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const fullPath = path.join(this.basePath, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, buffer);
    this.logger.log(`Uploaded file to ${filePath} (${mimeType})`);
    return filePath;
  }

  async download(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, filePath);
    return fs.readFileSync(fullPath);
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  async getSignedUrl(
    filePath: string,
    expiresInSec: number = 3600,
  ): Promise<string> {
    return `/uploads/${filePath}`;
  }
}
