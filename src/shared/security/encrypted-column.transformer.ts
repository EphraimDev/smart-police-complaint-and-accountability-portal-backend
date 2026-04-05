import { ValueTransformer } from "typeorm";
import { EncryptionUtil } from "./encryption.util";

export class EncryptedColumnTransformer implements ValueTransformer {
  constructor(private readonly key: string) {}

  to(value: string | null): string | null {
    if (value === null || value === undefined) return null;
    return EncryptionUtil.encrypt(value, this.key);
  }

  from(value: string | null): string | null {
    if (value === null || value === undefined) return null;
    try {
      return EncryptionUtil.decrypt(value, this.key);
    } catch {
      return value;
    }
  }
}
