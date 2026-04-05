import { registerAs } from "@nestjs/config";

export default registerAs("auth", () => ({
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET!,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
  jwtAccessExpiration: process.env.JWT_ACCESS_EXPIRATION || "15m",
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || "7d",
  jwtIssuer: process.env.JWT_ISSUER || "complaint-portal",
  authRateLimitTtl: parseInt(process.env.AUTH_RATE_LIMIT_TTL || "60000", 10),
  authRateLimitMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || "10", 10),
  fieldEncryptionKey: process.env.FIELD_ENCRYPTION_KEY!,
}));
