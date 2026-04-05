import { AiAnalysisType } from "@common/enums";

export interface AiProviderAnalysisInput {
  complaintId: string;
  text: string;
  category?: string;
  existingComplaints?: Array<{ id: string; text: string; category: string }>;
}

export interface AiClassificationResult {
  category: string;
  confidence: number;
  alternativeCategories: Array<{ category: string; confidence: number }>;
}

export interface AiPriorityResult {
  suggestedPriority: string;
  confidence: number;
  factors: string[];
}

export interface AiDuplicateResult {
  isDuplicate: boolean;
  confidence: number;
  similarComplaintIds: string[];
  similarityScores: Array<{ complaintId: string; score: number }>;
}

export interface AiEntityExtractionResult {
  persons: string[];
  locations: string[];
  dates: string[];
  organizations: string[];
  badgeNumbers: string[];
  vehiclePlates: string[];
}

export interface AiSummaryResult {
  summary: string;
  keyPoints: string[];
}

export interface AiPatternResult {
  patterns: Array<{
    patternType: string;
    description: string;
    affectedComplaints: string[];
    confidence: number;
  }>;
}

export interface AiRouteRecommendation {
  suggestedUnit: string;
  suggestedOfficerId?: string;
  confidence: number;
  reasoning: string;
}

export interface AiProvider {
  readonly name: string;
  classify(input: AiProviderAnalysisInput): Promise<AiClassificationResult>;
  scorePriority(input: AiProviderAnalysisInput): Promise<AiPriorityResult>;
  detectDuplicates(input: AiProviderAnalysisInput): Promise<AiDuplicateResult>;
  extractEntities(
    input: AiProviderAnalysisInput,
  ): Promise<AiEntityExtractionResult>;
  summarize(input: AiProviderAnalysisInput): Promise<AiSummaryResult>;
  detectPatterns(input: AiProviderAnalysisInput): Promise<AiPatternResult>;
  recommendRoute(
    input: AiProviderAnalysisInput,
  ): Promise<AiRouteRecommendation>;
}

export const AI_PROVIDER = Symbol("AI_PROVIDER");
