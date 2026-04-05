import { Entity, Column, Index } from "typeorm";
import { AuditableEntity } from "@shared/base/base.entity";
import { AssignmentStatus } from "@common/enums";

@Entity("complaint_assignments")
@Index(["complaintId"])
@Index(["assigneeId"])
@Index(["status"])
@Index(["slaDueDate"])
export class ComplaintAssignmentEntity extends AuditableEntity {
  @Column({ name: "complaint_id", type: "uuid" })
  complaintId!: string;

  @Column({ name: "assignee_id", type: "uuid" })
  assigneeId!: string;

  @Column({ name: "assigned_by_id", type: "uuid" })
  assignedById!: string;

  @Column({
    type: "enum",
    enum: AssignmentStatus,
    default: AssignmentStatus.PENDING,
  })
  status!: AssignmentStatus;

  @Column({ name: "assignment_reason", type: "text", nullable: true })
  assignmentReason!: string | null;

  @Column({ name: "sla_due_date", type: "timestamptz", nullable: true })
  slaDueDate!: Date | null;

  @Column({ name: "is_supervisor_override", default: false })
  isSupervisorOverride!: boolean;

  @Column({ name: "completed_at", type: "timestamptz", nullable: true })
  completedAt!: Date | null;

  @Column({ name: "previous_assignment_id", type: "uuid", nullable: true })
  previousAssignmentId!: string | null;
}
