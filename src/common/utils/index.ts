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

export function sanitizeForLog(
  obj: Record<string, unknown>,
): Record<string, unknown> {
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

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
