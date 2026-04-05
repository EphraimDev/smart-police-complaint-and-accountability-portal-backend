import { Injectable, Inject, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindOptionsWhere } from "typeorm";
import { AiAnalysisResultEntity } from "./entities/ai-analysis-result.entity";
import { ComplaintEntity } from "@modules/complaints/entities/complaint.entity";
import { AiAnalysisType, ReviewStatus } from "@common/enums";
import {
  AI_PROVIDER,
  AiProvider,
} from "@integrations/ai/ai-provider.interface";
import { AuditLogService } from "@modules/audit-logs/audit-log.service";
import { AuditAction } from "@common/enums";
import { createHash } from "crypto";
import { PaginatedResult } from "@shared/pagination/pagination.dto";
import {
  RequestAnalysisDto,
  ReviewAnalysisDto,
  ListAnalysesDto,
} from "./dto/ai.dto";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @InjectRepository(AiAnalysisResultEntity)
    private readonly analysisRepository: Repository<AiAnalysisResultEntity>,
    @InjectRepository(ComplaintEntity)
    private readonly complaintRepository: Repository<ComplaintEntity>,
    @Inject(AI_PROVIDER)
    private readonly aiProvider: AiProvider,
    private readonly auditLogService: AuditLogService,
  ) {}

  async requestAnalysis(
    dto: RequestAnalysisDto,
    actorId: string,
  ): Promise<AiAnalysisResultEntity> {
    const complaint = await this.complaintRepository.findOne({
      where: { id: dto.complaintId },
    });
    if (!complaint) throw new NotFoundException("Complaint not found");

    const input = {
      complaintId: complaint.id,
      text: complaint.description,
      category: complaint.category,
    };

    let result: Record<string, unknown> = {};
    let confidence = 0;
    let explanation = "";

    switch (dto.analysisType) {
      case AiAnalysisType.CLASSIFICATION:
        const classResult = await this.aiProvider.classify(input);
        result = classResult as unknown as Record<string, unknown>;
        confidence = classResult.confidence;
        explanation = `Classified as ${classResult.category}`;
        break;
      case AiAnalysisType.PRIORITY_SCORING:
        const priorityResult = await this.aiProvider.scorePriority(input);
        result = priorityResult as unknown as Record<string, unknown>;
        confidence = priorityResult.confidence;
        explanation = `Priority: ${priorityResult.suggestedPriority}`;
        break;
      case AiAnalysisType.DUPLICATE_DETECTION:
        const dupResult = await this.aiProvider.detectDuplicates(input);
        result = dupResult as unknown as Record<string, unknown>;
        confidence = dupResult.confidence;
        explanation = dupResult.isDuplicate
          ? "Potential duplicate detected"
          : "No duplicates found";
        break;
      case AiAnalysisType.ENTITY_EXTRACTION:
        const entityResult = await this.aiProvider.extractEntities(input);
        result = entityResult as unknown as Record<string, unknown>;
        confidence = 1.0;
        explanation = "Entities extracted";
        break;
      case AiAnalysisType.SUMMARIZATION:
        const sumResult = await this.aiProvider.summarize(input);
        result = sumResult as unknown as Record<string, unknown>;
        confidence = 1.0;
        explanation = "Summary generated";
        break;
      case AiAnalysisType.PATTERN_DETECTION:
        const patternResult = await this.aiProvider.detectPatterns(input);
        result = patternResult as unknown as Record<string, unknown>;
        confidence = 1.0;
        explanation = `${patternResult.patterns.length} patterns found`;
        break;
      case AiAnalysisType.ROUTE_RECOMMENDATION:
        const routeResult = await this.aiProvider.recommendRoute(input);
        result = routeResult as unknown as Record<string, unknown>;
        confidence = routeResult.confidence;
        explanation = routeResult.reasoning;
        break;
    }

    const inputPayload = {
      text: complaint.description,
      category: complaint.category,
    };
    const inputHash = createHash("sha256")
      .update(JSON.stringify(inputPayload))
      .digest("hex");

    const analysis = this.analysisRepository.create({
      complaintId: complaint.id,
      analysisType: dto.analysisType,
      modelName: this.aiProvider.name,
      modelVersion: "1.0",
      inputHash,
      output: result,
      confidenceScore: confidence,
      explanation,
      reviewStatus: ReviewStatus.PENDING,
    });

    const saved = await this.analysisRepository.save(analysis);

    await this.auditLogService.log({
      action: AuditAction.AI_ANALYSIS_REQUESTED,
      entityType: "ai_analysis_result",
      entityId: saved.id,
      actorId,
      afterState: { analysisType: dto.analysisType, complaintId: complaint.id },
    });

    return saved;
  }

  async reviewAnalysis(
    id: string,
    dto: ReviewAnalysisDto,
    actorId: string,
  ): Promise<AiAnalysisResultEntity> {
    const analysis = await this.analysisRepository.findOne({ where: { id } });
    if (!analysis) throw new NotFoundException("Analysis result not found");

    const before = { reviewStatus: analysis.reviewStatus };

    analysis.reviewStatus = dto.reviewStatus as ReviewStatus;
    analysis.reviewedBy = actorId;
    analysis.reviewedAt = new Date();
    analysis.humanOverrideReason = dto.reviewNotes ?? null;

    const saved = await this.analysisRepository.save(analysis);

    await this.auditLogService.log({
      action: AuditAction.AI_RESULT_REVIEWED,
      entityType: "ai_analysis_result",
      entityId: saved.id,
      actorId,
      beforeState: before,
      afterState: { reviewStatus: dto.reviewStatus },
    });

    return saved;
  }

  async findById(id: string): Promise<AiAnalysisResultEntity> {
    const analysis = await this.analysisRepository.findOne({
      where: { id },
      relations: ["complaint"],
    });
    if (!analysis) throw new NotFoundException("Analysis result not found");
    return analysis;
  }

  async findAll(
    dto: ListAnalysesDto,
  ): Promise<PaginatedResult<AiAnalysisResultEntity>> {
    const where: FindOptionsWhere<AiAnalysisResultEntity> = {};
    if (dto.complaintId) where.complaintId = dto.complaintId;
    if (dto.analysisType) where.analysisType = dto.analysisType;
    if (dto.reviewStatus) where.reviewStatus = dto.reviewStatus as ReviewStatus;

    const [items, total] = await this.analysisRepository.findAndCount({
      where,
      order: { [dto.sortBy || "createdAt"]: dto.sortOrder || "DESC" },
      skip: dto.skip,
      take: dto.limit,
      relations: ["complaint"],
    });

    return new PaginatedResult(items, total, dto.page, dto.limit);
  }
}
