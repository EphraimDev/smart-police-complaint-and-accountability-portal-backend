import { Entity, Column, Index } from "typeorm";
import { AuditableEntity, BaseEntity } from "@shared/base/base.entity";
import { EvidenceType, EvidenceAccessLevel } from "@common/enums";

@Entity("evidence")
@Index(["complaintId"])
@Index(["evidenceType"])
@Index(["accessLevel"])
export class EvidenceEntity extends AuditableEntity {
  @Column({ name: "complaint_id", type: "uuid" })
  complaintId!: string;

  @Column({ name: "file_name", type: "varchar", length: 255 })
  fileName!: string;

  @Column({ name: "original_name", type: "varchar", length: 255 })
  originalName!: string;

  @Column({ name: "mime_type", type: "varchar", length: 100 })
  mimeType!: string;

  @Column({ name: "file_size", type: "bigint" })
  fileSize!: number;

  @Column({ name: "storage_path", type: "text" })
  storagePath!: string;

  @Column({
    name: "storage_provider",
    type: "varchar",
    length: 20,
    default: "local",
  })
  storageProvider!: string;

  @Column({ name: "file_hash", type: "varchar", length: 128 })
  fileHash!: string;

  @Column({
    name: "hash_algorithm",
    type: "varchar",
    length: 20,
    default: "sha256",
  })
  hashAlgorithm!: string;

  @Column({ name: "evidence_type", type: "enum", enum: EvidenceType })
  evidenceType!: EvidenceType;

  @Column({
    name: "access_level",
    type: "enum",
    enum: EvidenceAccessLevel,
    default: EvidenceAccessLevel.RESTRICTED,
  })
  accessLevel!: EvidenceAccessLevel;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ name: "is_malware_scanned", default: false })
  isMalwareScanned!: boolean;

  @Column({
    name: "malware_scan_result",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  malwareScanResult!: string | null;

  @Column({ name: "is_integrity_verified", default: true })
  isIntegrityVerified!: boolean;
}

@Entity("evidence_chain_of_custody")
@Index(["evidenceId"])
export class EvidenceChainOfCustodyEntity extends BaseEntity {
  @Column({ name: "evidence_id", type: "uuid" })
  evidenceId!: string;

  @Column({ name: "actor_id", type: "uuid" })
  actorId!: string;

  @Column({ type: "varchar", length: 50 })
  action!: string;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ name: "ip_address", type: "varchar", length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, unknown> | null;
}
