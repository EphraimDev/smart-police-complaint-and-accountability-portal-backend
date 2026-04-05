export interface StorageProvider {
  upload(filePath: string, buffer: Buffer, mimeType: string): Promise<string>;
  download(filePath: string): Promise<Buffer>;
  delete(filePath: string): Promise<void>;
  getSignedUrl(filePath: string, expiresInSec?: number): Promise<string>;
}

export const STORAGE_PROVIDER = Symbol("STORAGE_PROVIDER");
