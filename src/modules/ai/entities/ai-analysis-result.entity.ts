import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "@shared/base/base.entity";
import { AiAnalysisType, ReviewStatus } from "@common/enums";

@Entity("ai_analysis_results")
@Index(["complaintId"])
@Index(["analysisType"])
@Index(["reviewStatus"])
@Index(["createdAt"])
export class AiAnalysisResultEntity extends BaseEntity {
  @Column({ name: "complaint_id", type: "uuid" })
  complaintId!: string;

  @Column({ name: "model_name", type: "varchar", length: 100 })
  modelName!: string;

  @Column({ name: "model_version", type: "varchar", length: 30 })
  modelVersion!: string;

  @Column({ name: "analysis_type", type: "enum", enum: AiAnalysisType })
  analysisType!: AiAnalysisType;

  @Column({ name: "input_hash", type: "varchar", length: 128 })
  inputHash!: string;

  @Column({ type: "jsonb" })
  output!: Record<string, unknown>;

  @Column({
    name: "confidence_score",
    type: "decimal",
    precision: 5,
    scale: 4,
    nullable: true,
  })
  confidenceScore!: number | null;

  @Column({ type: "text", nullable: true })
  explanation!: string | null;

  @Column({
    name: "recommended_category",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  recommendedCategory!: string | null;

  @Column({
    name: "recommended_priority",
    type: "varchar",
    length: 20,
    nullable: true,
  })
  recommendedPriority!: string | null;

  @Column({ name: "duplicate_matches", type: "jsonb", nullable: true })
  duplicateMatches!: string[] | null;

  @Column({
    name: "review_status",
    type: "enum",
    enum: ReviewStatus,
    default: ReviewStatus.PENDING,
  })
  reviewStatus!: ReviewStatus;

  @Column({ name: "reviewed_by", type: "uuid", nullable: true })
  reviewedBy!: string | null;

  @Column({ name: "reviewed_at", type: "timestamptz", nullable: true })
  reviewedAt!: Date | null;

  @Column({ name: "human_override_reason", type: "text", nullable: true })
  humanOverrideReason!: string | null;

  @Column({ name: "processing_time_ms", type: "int", nullable: true })
  processingTimeMs!: number | null;
}
