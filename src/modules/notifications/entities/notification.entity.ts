import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "@shared/base/base.entity";
import { NotificationType, NotificationStatus } from "@common/enums";

@Entity("notifications")
@Index(["recipientId"])
@Index(["status"])
@Index(["type"])
@Index(["createdAt"])
export class NotificationEntity extends BaseEntity {
  @Column({ name: "recipient_id", type: "uuid", nullable: true })
  recipientId!: string | null;

  @Column({
    name: "recipient_email",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  recipientEmail!: string | null;

  @Column({
    name: "recipient_phone",
    type: "varchar",
    length: 30,
    nullable: true,
  })
  recipientPhone!: string | null;

  @Column({ type: "enum", enum: NotificationType })
  type!: NotificationType;

  @Column({ type: "varchar", length: 200 })
  subject!: string;

  @Column({ type: "text" })
  body!: string;

  @Column({
    type: "enum",
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status!: NotificationStatus;

  @Column({ name: "sent_at", type: "timestamptz", nullable: true })
  sentAt!: Date | null;

  @Column({ name: "failed_at", type: "timestamptz", nullable: true })
  failedAt!: Date | null;

  @Column({ name: "failure_reason", type: "text", nullable: true })
  failureReason!: string | null;

  @Column({ name: "retry_count", type: "int", default: 0 })
  retryCount!: number;

  @Column({ name: "max_retries", type: "int", default: 3 })
  maxRetries!: number;

  @Column({
    name: "reference_type",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  referenceType!: string | null;

  @Column({ name: "reference_id", type: "uuid", nullable: true })
  referenceId!: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, unknown> | null;
}
