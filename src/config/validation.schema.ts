import * as Joi from "joi";

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "staging", "production", "test")
    .default("development"),
  PORT: Joi.number().default(3000),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_SSL: Joi.boolean().default(false),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow("").default(""),
  REDIS_DB: Joi.number().default(0),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default("15m"),
  JWT_REFRESH_EXPIRATION: Joi.string().default("7d"),
  JWT_ISSUER: Joi.string().default("complaint-portal"),

  FIELD_ENCRYPTION_KEY: Joi.string().length(32).required(),
  PAYLOAD_ENCRYPTION_ENABLED: Joi.boolean().default(false),
  PAYLOAD_ENCRYPTION_KEY: Joi.when("PAYLOAD_ENCRYPTION_ENABLED", {
    is: true,
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().allow("").default(""),
  }),
  PAYLOAD_ENCRYPTION_ALGORITHM: Joi.string().default("aes-256-gcm"),
  GCM_IV_LENGTH: Joi.number().default(12),
  GCM_TAG_LENGTH: Joi.number().default(16),
  ENCRYPTED_PAYLOAD_SEPARATOR: Joi.string().default("."),

  RATE_LIMIT_TTL: Joi.number().default(60000),
  RATE_LIMIT_MAX: Joi.number().default(100),
  AUTH_RATE_LIMIT_TTL: Joi.number().default(60000),
  AUTH_RATE_LIMIT_MAX: Joi.number().default(10),

  MAX_FILE_SIZE: Joi.number().default(10485760),
  ALLOWED_FILE_TYPES: Joi.string().default(
    "image/jpeg,image/png,image/gif,application/pdf,video/mp4,audio/mpeg",
  ),
  UPLOAD_DEST: Joi.string().default("./uploads"),

  CORS_ORIGIN: Joi.string().default("http://localhost:3001"),

  LOG_LEVEL: Joi.string()
    .valid("error", "warn", "info", "debug", "verbose")
    .default("info"),
  LOG_DIR: Joi.string().default("./logs"),

  QUEUE_PREFIX: Joi.string().default("complaint-portal"),

  AI_PROVIDER: Joi.string().default("mock"),
  AI_API_URL: Joi.string().allow("").default(""),
  AI_API_KEY: Joi.string().allow("").default(""),

  SMS_PROVIDER: Joi.string().default("mock"),
  EMAIL_PROVIDER: Joi.string().default("mock"),
  EMAIL_FROM: Joi.string().default("noreply@complaint-portal.gov"),

  STORAGE_PROVIDER: Joi.string().valid("local", "s3", "azure").default("local"),

  APP_NAME: Joi.string().default("Smart Police Complaint Portal"),
  API_PREFIX: Joi.string().default("api/v1"),
  SWAGGER_ENABLED: Joi.boolean().default(true),
});
