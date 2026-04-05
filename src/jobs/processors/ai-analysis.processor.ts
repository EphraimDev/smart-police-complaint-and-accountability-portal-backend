import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger, Inject } from "@nestjs/common";
import { Job } from "bullmq";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { QUEUE_NAMES } from "@common/constants";
import { AiAnalysisResultEntity } from "@modules/ai/entities/ai-analysis-result.entity";
import { ComplaintEntity } from "@modules/complaints/entities/complaint.entity";
import {
  AI_PROVIDER,
  AiProvider,
} from "@integrations/ai/ai-provider.interface";
import { AiAnalysisType, ReviewStatus } from "@common/enums";
import { createHash } from "crypto";

interface AiAnalysisJobData {
  complaintId: string;
  analysisTypes: AiAnalysisType[];
  requestedBy?: string;
}

@Processor(QUEUE_NAMES.AI_ANALYSIS)
export class AiAnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(AiAnalysisProcessor.name);

  constructor(
    @InjectRepository(AiAnalysisResultEntity)
    private readonly analysisRepository: Repository<AiAnalysisResultEntity>,
    @InjectRepository(ComplaintEntity)
    private readonly complaintRepository: Repository<ComplaintEntity>,
    @Inject(AI_PROVIDER)
    private readonly aiProvider: AiProvider,
  ) {
    super();
  }

  async process(job: Job<AiAnalysisJobData>): Promise<void> {
    const { complaintId, analysisTypes, requestedBy } = job.data;
    this.logger.log(
      `Processing AI analysis job ${job.id} for complaint ${complaintId}`,
    );

    const complaint = await this.complaintRepository.findOne({
      where: { id: complaintId },
    });
    if (!complaint) {
      this.logger.warn(
        `Complaint ${complaintId} not found, skipping AI analysis`,
      );
      return;
    }

    const input = {
      complaintId: complaint.id,
      text: complaint.description,
      category: complaint.category,
    };

    for (const type of analysisTypes) {
      try {
        let resultData: Record<string, unknown> = {};
        let confidence = 0;
        let explanation = "";

        switch (type) {
          case AiAnalysisType.CLASSIFICATION:
            const cr = await this.aiProvider.classify(input);
            resultData = cr as unknown as Record<string, unknown>;
            confidence = cr.confidence;
            explanation = `Classified as ${cr.category}`;
            break;
          case AiAnalysisType.PRIORITY_SCORING:
            const pr = await this.aiProvider.scorePriority(input);
            resultData = pr as unknown as Record<string, unknown>;
            confidence = pr.confidence;
            explanation = `Priority: ${pr.suggestedPriority}`;
            break;
          case AiAnalysisType.DUPLICATE_DETECTION:
            const dr = await this.aiProvider.detectDuplicates(input);
            resultData = dr as unknown as Record<string, unknown>;
            confidence = dr.confidence;
            explanation = dr.isDuplicate
              ? "Duplicate detected"
              : "No duplicates";
            break;
          case AiAnalysisType.ENTITY_EXTRACTION:
            const er = await this.aiProvider.extractEntities(input);
            resultData = er as unknown as Record<string, unknown>;
            confidence = 1.0;
            explanation = "Entities extracted";
            break;
          case AiAnalysisType.SUMMARIZATION:
            const sr = await this.aiProvider.summarize(input);
            resultData = sr as unknown as Record<string, unknown>;
            confidence = 1.0;
            explanation = "Summary generated";
            break;
          default:
            this.logger.warn(`Unknown analysis type: ${type}`);
            continue;
        }

        const inputHash = createHash("sha256")
          .update(JSON.stringify({ text: complaint.description }))
          .digest("hex");

        const analysis = this.analysisRepository.create({
          complaintId,
          analysisType: type,
          modelName: this.aiProvider.name,
          modelVersion: "1.0",
          inputHash,
          output: resultData,
          confidenceScore: confidence,
          explanation,
          reviewStatus: ReviewStatus.PENDING,
        });

        await this.analysisRepository.save(analysis);
        this.logger.log(
          `AI analysis ${type} completed for complaint ${complaintId}`,
        );
      } catch (error) {
        this.logger.error(
          `AI analysis ${type} failed for complaint ${complaintId}: ${(error as Error).message}`,
        );
        // Continue with other analysis types
      }
    }
  }
}
