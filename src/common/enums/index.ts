export enum UserRole {
  CITIZEN = "citizen",
  ADMIN = "admin",
  COMPLAINT_DESK_OFFICER = "complaint_desk_officer",
  INVESTIGATOR = "investigator",
  SUPERVISOR = "supervisor",
  INTERNAL_AFFAIRS_OFFICER = "internal_affairs_officer",
  OVERSIGHT_OFFICER = "oversight_officer",
}
 
export enum Permission {
  // Complaint permissions
  COMPLAINT_CREATE = "complaint:create",
  COMPLAINT_READ = "complaint:read",
  COMPLAINT_READ_OWN = "complaint:read_own",
  COMPLAINT_UPDATE = "complaint:update",
  COMPLAINT_DELETE = "complaint:delete",
  COMPLAINT_ASSIGN = "complaint:assign",
  COMPLAINT_ESCALATE = "complaint:escalate",
  COMPLAINT_CLOSE = "complaint:close",

  // Evidence permissions
  EVIDENCE_UPLOAD = "evidence:upload",
  EVIDENCE_READ = "evidence:read",
  EVIDENCE_DELETE = "evidence:delete",

  // Officer permissions
  OFFICER_CREATE = "officer:create",
  OFFICER_READ = "officer:read",
  OFFICER_UPDATE = "officer:update",
  OFFICER_DELETE = "officer:delete",

  // Station permissions
  STATION_CREATE = "station:create",
  STATION_READ = "station:read",
  STATION_UPDATE = "station:update",
  STATION_DELETE = "station:delete",

  // User permissions
  USER_CREATE = "user:create",
  USER_READ = "user:read",
  USER_UPDATE = "user:update",
  USER_DEACTIVATE = "user:deactivate",
  USER_ASSIGN_ROLE = "user:assign_role",

  // Role permissions
  ROLE_CREATE = "role:create",
  ROLE_READ = "role:read",
  ROLE_UPDATE = "role:update",
  ROLE_DELETE = "role:delete",

  // Oversight permissions
  OVERSIGHT_VIEW = "oversight:view",
  OVERSIGHT_ACTION = "oversight:action",

  // Report permissions
  REPORT_VIEW = "report:view",
  REPORT_EXPORT = "report:export",

  // Audit permissions
  AUDIT_READ = "audit:read",

  // Admin permissions
  ADMIN_DASHBOARD = "admin:dashboard",
  ADMIN_CONFIG = "admin:config",

  // AI permissions
  AI_REQUEST_ANALYSIS = "ai:request_analysis",
  AI_VIEW_RESULTS = "ai:view_results",
  AI_REVIEW = "ai:review",

  // Notification permissions
  NOTIFICATION_MANAGE = "notification:manage",
}

export enum ComplaintStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  ACKNOWLEDGED = "acknowledged",
  UNDER_REVIEW = "under_review",
  ASSIGNED = "assigned",
  UNDER_INVESTIGATION = "under_investigation",
  AWAITING_RESPONSE = "awaiting_response",
  ESCALATED = "escalated",
  RESOLVED = "resolved",
  CLOSED = "closed",
  REJECTED = "rejected",
  WITHDRAWN = "withdrawn",
}

export enum ComplaintSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum ComplaintCategory {
  EXCESSIVE_FORCE = "excessive_force",
  MISCONDUCT = "misconduct",
  CORRUPTION = "corruption",
  DISCRIMINATION = "discrimination",
  HARASSMENT = "harassment",
  NEGLIGENCE = "negligence",
  UNLAWFUL_ARREST = "unlawful_arrest",
  ABUSE_OF_POWER = "abuse_of_power",
  PROPERTY_DAMAGE = "property_damage",
  UNPROFESSIONAL_CONDUCT = "unprofessional_conduct",
  DELAYED_RESPONSE = "delayed_response",
  OTHER = "other",
}

export enum ComplaintSource {
  CITIZEN_DIRECT = "citizen_direct",
  ANONYMOUS = "anonymous",
  THIRD_PARTY = "third_party",
  INTERNAL = "internal",
  OVERSIGHT_REFERRAL = "oversight_referral",
  MEDIA = "media",
}

export enum ComplaintChannel {
  WEB = "web",
  MOBILE = "mobile",
  PHONE = "phone",
  IN_PERSON = "in_person",
  EMAIL = "email",
  LETTER = "letter",
}

export enum AssignmentStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  REASSIGNED = "reassigned",
  DECLINED = "declined",
}

export enum EvidenceType {
  DOCUMENT = "document",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  FORENSIC = "forensic",
  WITNESS_STATEMENT = "witness_statement",
  OTHER = "other",
}

export enum EvidenceAccessLevel {
  PUBLIC = "public",
  RESTRICTED = "restricted",
  CONFIDENTIAL = "confidential",
  CLASSIFIED = "classified",
}

export enum NotificationType {
  EMAIL = "email",
  SMS = "sms",
  IN_APP = "in_app",
  PUSH = "push",
}

export enum NotificationStatus {
  PENDING = "pending",
  SENT = "sent",
  DELIVERED = "delivered",
  FAILED = "failed",
  RETRYING = "retrying",
}

export enum AuditAction {
  // Auth
  LOGIN = "login",
  LOGIN_FAILED = "login_failed",
  LOGOUT = "logout",
  TOKEN_REFRESH = "token_refresh",
  PASSWORD_CHANGE = "password_change",

  // User
  USER_CREATED = "user_created",
  USER_UPDATED = "user_updated",
  USER_DEACTIVATED = "user_deactivated",
  USER_ACTIVATED = "user_activated",
  ROLE_ASSIGNED = "role_assigned",
  ROLE_REVOKED = "role_revoked",

  // Complaint
  COMPLAINT_CREATED = "complaint_created",
  COMPLAINT_UPDATED = "complaint_updated",
  COMPLAINT_STATUS_CHANGED = "complaint_status_changed",
  COMPLAINT_ASSIGNED = "complaint_assigned",
  COMPLAINT_REASSIGNED = "complaint_reassigned",
  COMPLAINT_ESCALATED = "complaint_escalated",
  COMPLAINT_CLOSED = "complaint_closed",
  COMPLAINT_WITHDRAWN = "complaint_withdrawn",

  // Evidence
  EVIDENCE_UPLOADED = "evidence_uploaded",
  EVIDENCE_ACCESSED = "evidence_accessed",
  EVIDENCE_DELETED = "evidence_deleted",
  EVIDENCE_INTEGRITY_CHECK = "evidence_integrity_check",

  // Officer
  OFFICER_CREATED = "officer_created",
  OFFICER_UPDATED = "officer_updated",

  // Oversight
  OVERSIGHT_REFERRAL = "oversight_referral",
  OVERSIGHT_REVIEW = "oversight_review",
  DISCIPLINARY_RECOMMENDATION = "disciplinary_recommendation",

  // AI
  AI_ANALYSIS_REQUESTED = "ai_analysis_requested",
  AI_ANALYSIS_COMPLETED = "ai_analysis_completed",
  AI_RESULT_REVIEWED = "ai_result_reviewed",
  AI_RESULT_OVERRIDDEN = "ai_result_overridden",

  // Admin
  CONFIG_CHANGED = "config_changed",
  ROLE_CREATED = "role_created",
  ROLE_UPDATED = "role_updated",
  PERMISSION_CHANGED = "permission_changed",
}

export enum AiAnalysisType {
  CLASSIFICATION = "classification",
  PRIORITY_SCORING = "priority_scoring",
  DUPLICATE_DETECTION = "duplicate_detection",
  ENTITY_EXTRACTION = "entity_extraction",
  SUMMARIZATION = "summarization",
  PATTERN_DETECTION = "pattern_detection",
  ROUTE_RECOMMENDATION = "route_recommendation",
}

export enum ReviewStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  OVERRIDDEN = "overridden",
}

export enum EscalationReason {
  SLA_BREACH = "sla_breach",
  SEVERITY_UPGRADE = "severity_upgrade",
  SUPERVISOR_REQUEST = "supervisor_request",
  CITIZEN_APPEAL = "citizen_appeal",
  OVERSIGHT_REFERRAL = "oversight_referral",
  REPEATED_OFFICER = "repeated_officer",
}
