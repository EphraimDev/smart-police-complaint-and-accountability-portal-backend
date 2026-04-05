import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "@shared/base/base.entity";
import { ComplaintStatus } from "@common/enums";

@Entity("complaint_status_history")
@Index(["complaintId", "createdAt"])
export class ComplaintStatusHistoryEntity extends BaseEntity {
  @Column({ name: "complaint_id", type: "uuid" })
  complaintId!: string;

  @Column({
    name: "previous_status",
    type: "enum",
    enum: ComplaintStatus,
    nullable: true,
  })
  previousStatus!: ComplaintStatus | null;

  @Column({ name: "new_status", type: "enum", enum: ComplaintStatus })
  newStatus!: ComplaintStatus;

  @Column({ name: "changed_by_id", type: "uuid" })
  changedById!: string;

  @Column({ name: "reason_code", type: "varchar", length: 50, nullable: true })
  reasonCode!: string | null;

  @Column({ type: "text", nullable: true })
  reason!: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, unknown> | null;
}
