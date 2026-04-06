import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { AuditableEntity } from "@shared/base/base.entity";
import { AssignmentStatus } from "@common/enums";
import { PoliceStationEntity } from "@modules/police-stations/entities/police-station.entity";
import { OfficerEntity } from "@modules/officers/entities/officer.entity";
import { UserEntity } from "@modules/users/entities/user.entity";

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

  @ManyToOne(() => OfficerEntity, { nullable: true })
  @JoinColumn({ name: "assignee_id" })
  assignee!: OfficerEntity | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: "assigned_by_id" })
  assignedBy!: UserEntity | null;

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
