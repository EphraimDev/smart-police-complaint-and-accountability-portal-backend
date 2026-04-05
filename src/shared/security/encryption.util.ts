import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

export class EncryptionUtil {
  static encrypt(plaintext: string, key: string): string {
    const keyBuffer = Buffer.from(key, "utf-8");
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);

    let encrypted = cipher.update(plaintext, "utf-8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
  }

  static decrypt(ciphertext: string, key: string): string {
    const keyBuffer = Buffer.from(key, "utf-8");
    const [ivHex, tagHex, encrypted] = ciphertext.split(":");

    if (!ivHex || !tagHex || !encrypted) {
      throw new Error("Invalid ciphertext format");
    }

    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, "hex", "utf-8");
    decrypted += decipher.final("utf-8");
    return decrypted;
  }

  static hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }
}
