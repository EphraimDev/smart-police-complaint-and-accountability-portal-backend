import { v4 as uuidv4 } from "uuid";
import { APP_CONSTANTS } from "@common/constants";

export function generateComplaintReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = uuidv4().split("-")[0]!.toUpperCase();
  return `${APP_CONSTANTS.COMPLAINT_REFERENCE_PREFIX}-${timestamp}-${random}`;
}

export function parseTimeString(timeStr: string): number {
  const match = timeStr.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid time string: ${timeStr}`);

  const value = parseInt(match[1]!, 10);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
}

export function sanitizeForLog<T>(obj: T): T {
  const sensitiveKeys = [
    "password",
    "token",
    "secret",
    "authorization",
    "cookie",
    "phone",
    "email",
    "address",
    "nationalId",
    "ssn",
  ];

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForLog(item)) as T;
  }

  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const normalizedKey = key.toLowerCase();

    if (normalizedKey.includes("email")) {
      sanitized[key] = maskEmailForLog(value);
      continue;
    }

    if (sensitiveKeys.some((sk) => normalizedKey.includes(sk))) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    sanitized[key] = sanitizeForLog(value);
  }

  return sanitized as T;
}

function maskEmailForLog(value: unknown): unknown {
  if (typeof value !== "string") {
    return "[REDACTED]";
  }

  const [localPart, domain] = value.split("@");

  if (!localPart || !domain) {
    return "[REDACTED]";
  }

  if (localPart.length <= 4) {
    return `${localPart}@${domain}`;
  }

  const firstTwoChars = localPart.slice(0, 2);
  const lastTwoChars = localPart.slice(-2);
  const maskedMiddle = "*".repeat(localPart.length - 4);

  return `${firstTwoChars}${maskedMiddle}${lastTwoChars}@${domain}`;
}
