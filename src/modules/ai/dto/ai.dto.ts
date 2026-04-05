import { IsUUID, IsEnum, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AiAnalysisType } from "@common/enums";
import { PaginationDto } from "@shared/pagination/pagination.dto";

export class RequestAnalysisDto {
  @ApiProperty()
  @IsUUID()
  complaintId!: string;

  @ApiProperty({ enum: AiAnalysisType })
  @IsEnum(AiAnalysisType)
  analysisType!: AiAnalysisType;
}

export class ReviewAnalysisDto {
  @ApiProperty({ enum: ["ACCEPTED", "REJECTED", "MODIFIED"] })
  @IsString()
  reviewStatus!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  humanOverride?: Record<string, unknown>;
}

export class ListAnalysesDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  complaintId?: string;

  @ApiPropertyOptional({ enum: AiAnalysisType })
  @IsOptional()
  @IsEnum(AiAnalysisType)
  analysisType?: AiAnalysisType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewStatus?: string;
}
