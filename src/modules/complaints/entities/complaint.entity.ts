import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from "typeorm";
import { AuditableEntity } from "@shared/base/base.entity";
import {
  ComplaintStatus,
  ComplaintSeverity,
  ComplaintCategory,
  ComplaintSource,
  ComplaintChannel,
} from "@common/enums";

@Entity("complaints")
@Index(["referenceNumber"], { unique: true })
@Index(["status"])
@Index(["category"])
@Index(["severity"])
@Index(["createdAt"])
@Index(["citizenUserId"])
@Index(["stationId"])
export class ComplaintEntity extends AuditableEntity {
  @Column({
    name: "reference_number",
    type: "varchar",
    length: 30,
    unique: true,
  })
  referenceNumber!: string;

  @Column({ type: "text" })
  title!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({
    type: "enum",
    enum: ComplaintStatus,
    default: ComplaintStatus.SUBMITTED,
  })
  status!: ComplaintStatus;

  @Column({
    type: "enum",
    enum: ComplaintSeverity,
    default: ComplaintSeverity.MEDIUM,
  })
  severity!: ComplaintSeverity;

  @Column({ type: "enum", enum: ComplaintCategory })
  category!: ComplaintCategory;

  @Column({
    type: "enum",
    enum: ComplaintSource,
    default: ComplaintSource.CITIZEN_DIRECT,
  })
  source!: ComplaintSource;

  @Column({
    type: "enum",
    enum: ComplaintChannel,
    default: ComplaintChannel.WEB,
  })
  channel!: ComplaintChannel;

  @Column({ name: "is_anonymous", default: false })
  isAnonymous!: boolean;

  @Column({ name: "citizen_user_id", type: "uuid", nullable: true })
  citizenUserId!: string | null;

  @Column({ name: "complainant_name_encrypted", type: "text", nullable: true })
  complainantNameEncrypted!: string | null;

  @Column({ name: "complainant_email_encrypted", type: "text", nullable: true })
  complainantEmailEncrypted!: string | null;

  @Column({ name: "complainant_phone_encrypted", type: "text", nullable: true })
  complainantPhoneEncrypted!: string | null;

  @Column({
    name: "complainant_address_encrypted",
    type: "text",
    nullable: true,
  })
  complainantAddressEncrypted!: string | null;

  @Column({ name: "incident_date", type: "date", nullable: true })
  incidentDate!: Date | null;

  @Column({ name: "incident_location", type: "text", nullable: true })
  incidentLocation!: string | null;

  @Column({ name: "station_id", type: "uuid", nullable: true })
  stationId!: string | null;

  @Column({
    name: "tracking_token",
    type: "varchar",
    length: 64,
    nullable: true,
    unique: true,
  })
  trackingToken!: string | null;

  @Column({ name: "resolution_summary", type: "text", nullable: true })
  resolutionSummary!: string | null;

  @Column({ name: "closed_at", type: "timestamptz", nullable: true })
  closedAt!: Date | null;

  @Column({ name: "sla_due_date", type: "timestamptz", nullable: true })
  slaDueDate!: Date | null;

  @Column({ name: "is_overdue", default: false })
  isOverdue!: boolean;

  @Column({
    name: "idempotency_key",
    type: "varchar",
    length: 64,
    nullable: true,
    unique: true,
  })
  idempotencyKey!: string | null;

  @Column({ type: "int", default: 1 })
  version!: number;
}

@Entity("complaint_categories_ref")
export class ComplaintCategoryRefEntity {
  @Column({ type: "uuid", primary: true, generated: "uuid" })
  id!: string;

  @Column({ unique: true, length: 100 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ name: "is_active", default: true })
  isActive!: boolean;

  @Column({
    name: "created_at",
    type: "timestamptz",
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt!: Date;
}

@Entity("complaint_notes")
@Index(["complaintId"])
export class ComplaintNoteEntity extends AuditableEntity {
  @Column({ name: "complaint_id", type: "uuid" })
  complaintId!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ name: "is_internal", default: true })
  isInternal!: boolean;

  @Column({
    name: "note_type",
    type: "varchar",
    length: 50,
    default: "general",
  })
  noteType!: string;
}
