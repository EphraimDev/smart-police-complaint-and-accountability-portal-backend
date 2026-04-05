import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "@shared/base/base.entity";
import { AuditAction } from "@common/enums";

@Entity("audit_logs")
@Index(["entityType", "entityId"])
@Index(["actorId"])
@Index(["action"])
@Index(["createdAt"])
@Index(["correlationId"])
export class AuditLogEntity extends BaseEntity {
  @Column({ name: "actor_id", type: "uuid", nullable: true })
  actorId!: string | null;

  @Column({ name: "actor_email", type: "varchar", length: 255, nullable: true })
  actorEmail!: string | null;

  @Column({ type: "enum", enum: AuditAction })
  action!: AuditAction;

  @Column({ name: "entity_type", type: "varchar", length: 50 })
  entityType!: string;

  @Column({ name: "entity_id", type: "uuid", nullable: true })
  entityId!: string | null;

  @Column({ name: "before_state", type: "jsonb", nullable: true })
  beforeState!: Record<string, unknown> | null;

  @Column({ name: "after_state", type: "jsonb", nullable: true })
  afterState!: Record<string, unknown> | null;

  @Column({ name: "ip_address", type: "varchar", length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ name: "user_agent", type: "text", nullable: true })
  userAgent!: string | null;

  @Column({
    name: "correlation_id",
    type: "varchar",
    length: 64,
    nullable: true,
  })
  correlationId!: string | null;

  @Column({ type: "varchar", length: 20, default: "success" })
  outcome!: string;

  @Column({ name: "failure_reason", type: "text", nullable: true })
  failureReason!: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, unknown> | null;
}
