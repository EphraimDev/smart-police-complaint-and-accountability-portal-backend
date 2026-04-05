import { Injectable, Logger } from "@nestjs/common";
import {
  AiProvider,
  AiProviderAnalysisInput,
  AiClassificationResult,
  AiPriorityResult,
  AiDuplicateResult,
  AiEntityExtractionResult,
  AiSummaryResult,
  AiPatternResult,
  AiRouteRecommendation,
} from "./ai-provider.interface";

/**
 * Mock AI provider for development and testing.
 * Replace with a real provider (OpenAI, Azure AI, etc.) for production.
 */
@Injectable()
export class MockAiProvider implements AiProvider {
  private readonly logger = new Logger(MockAiProvider.name);
  readonly name = "mock";

  async classify(
    input: AiProviderAnalysisInput,
  ): Promise<AiClassificationResult> {
    this.logger.debug(`Mock classify for complaint ${input.complaintId}`);
    return {
      category: input.category ?? "MISCONDUCT",
      confidence: 0.75,
      alternativeCategories: [
        { category: "EXCESSIVE_FORCE", confidence: 0.15 },
        { category: "NEGLIGENCE", confidence: 0.1 },
      ],
    };
  }

  async scorePriority(
    input: AiProviderAnalysisInput,
  ): Promise<AiPriorityResult> {
    this.logger.debug(`Mock scorePriority for complaint ${input.complaintId}`);
    return {
      suggestedPriority: "MEDIUM",
      confidence: 0.7,
      factors: [
        "Contains keywords indicating moderate severity",
        "No immediate danger indicators",
      ],
    };
  }

  async detectDuplicates(
    input: AiProviderAnalysisInput,
  ): Promise<AiDuplicateResult> {
    this.logger.debug(
      `Mock detectDuplicates for complaint ${input.complaintId}`,
    );
    return {
      isDuplicate: false,
      confidence: 0.9,
      similarComplaintIds: [],
      similarityScores: [],
    };
  }

  async extractEntities(
    input: AiProviderAnalysisInput,
  ): Promise<AiEntityExtractionResult> {
    this.logger.debug(
      `Mock extractEntities for complaint ${input.complaintId}`,
    );
    return {
      persons: [],
      locations: [],
      dates: [],
      organizations: [],
      badgeNumbers: [],
      vehiclePlates: [],
    };
  }

  async summarize(input: AiProviderAnalysisInput): Promise<AiSummaryResult> {
    this.logger.debug(`Mock summarize for complaint ${input.complaintId}`);
    const text = input.text;
    return {
      summary: text.length > 200 ? text.substring(0, 200) + "..." : text,
      keyPoints: [
        "Mock summary — replace with real AI provider for production",
      ],
    };
  }

  async detectPatterns(
    input: AiProviderAnalysisInput,
  ): Promise<AiPatternResult> {
    this.logger.debug(`Mock detectPatterns for complaint ${input.complaintId}`);
    return { patterns: [] };
  }

  async recommendRoute(
    input: AiProviderAnalysisInput,
  ): Promise<AiRouteRecommendation> {
    this.logger.debug(`Mock recommendRoute for complaint ${input.complaintId}`);
    return {
      suggestedUnit: "Internal Affairs",
      confidence: 0.6,
      reasoning: "Default routing — mock provider",
    };
  }
}
