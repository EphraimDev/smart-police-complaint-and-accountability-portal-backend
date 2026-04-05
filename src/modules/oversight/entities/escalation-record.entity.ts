import { Entity, Column, Index } from "typeorm";
import { AuditableEntity } from "@shared/base/base.entity";
import { EscalationReason } from "@common/enums";

@Entity("escalation_records")
@Index(["complaintId"])
@Index(["escalatedById"])
@Index(["status"])
@Index(["dueDate"])
export class EscalationRecordEntity extends AuditableEntity {
  @Column({ name: "complaint_id", type: "uuid" })
  complaintId!: string;

  @Column({ name: "escalated_by_id", type: "uuid" })
  escalatedById!: string;

  @Column({ name: "escalated_to_id", type: "uuid", nullable: true })
  escalatedToId!: string | null;

  @Column({ type: "enum", enum: EscalationReason })
  reason!: EscalationReason;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "varchar", length: 30, default: "pending" })
  status!: string;

  @Column({ name: "due_date", type: "timestamptz", nullable: true })
  dueDate!: Date | null;

  @Column({ name: "review_notes", type: "text", nullable: true })
  reviewNotes!: string | null;

  @Column({ name: "reviewed_by_id", type: "uuid", nullable: true })
  reviewedById!: string | null;

  @Column({ name: "reviewed_at", type: "timestamptz", nullable: true })
  reviewedAt!: Date | null;

  @Column({ name: "disciplinary_recommendation", type: "text", nullable: true })
  disciplinaryRecommendation!: string | null;
}
