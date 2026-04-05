export const APP_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PASSWORD_LENGTH: 8,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 30,
  COMPLAINT_REFERENCE_PREFIX: "CMP",
  EVIDENCE_HASH_ALGORITHM: "sha256",
  IDEMPOTENCY_KEY_HEADER: "x-idempotency-key",
  CORRELATION_ID_HEADER: "x-correlation-id",
  REQUEST_TIMESTAMP_HEADER: "x-request-timestamp",
} as const;

export const QUEUE_NAMES = {
  NOTIFICATIONS: "notifications",
  AI_ANALYSIS: "ai-analysis",
  EVIDENCE_PROCESSING: "evidence-processing",
  OVERDUE_CHECK: "overdue-check",
  REPORT_GENERATION: "report-generation",
} as const;

export const CACHE_KEYS = {
  ROLES: "roles",
  PERMISSIONS: "permissions",
  ROLE_PERMISSIONS: "role-permissions",
  COMPLAINT_CATEGORIES: "complaint-categories",
  STATIONS: "stations",
} as const;

export const CACHE_TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
  VERY_LONG: 86400,
} as const;
