import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000", 10),
  name: process.env.APP_NAME || "Smart Police Complaint Portal",
  apiPrefix: process.env.API_PREFIX || "api/v1",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3001",
  swaggerEnabled: process.env.SWAGGER_ENABLED === "true",
  payloadEncryptionEnabled: process.env.PAYLOAD_ENCRYPTION_ENABLED === "true",
  payloadEncryptionKey: process.env.PAYLOAD_ENCRYPTION_KEY || "",
  rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL || "60000", 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760", 10),
  allowedFileTypes: (
    process.env.ALLOWED_FILE_TYPES || "image/jpeg,image/png,application/pdf"
  ).split(","),
  uploadDest: process.env.UPLOAD_DEST || "./uploads",
  logLevel: process.env.LOG_LEVEL || "info",
  logDir: process.env.LOG_DIR || "./logs",
  payloadEncryptionAlgorithm: process.env.PAYLOAD_ENCRYPTION_ALGORITHM || "aes-256-gcm",
  payloadEncryptionIVLength: parseInt(process.env.GCM_IV_LENGTH || "12", 10),
  payloadEncryptionTagLength: parseInt(process.env.GCM_TAG_LENGTH || "16", 10),
  encryptedPayloadSeparator: process.env.ENCRYPTED_PAYLOAD_SEPARATOR || ".",
}));
