import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
} from "class-validator";
import { EscalationReason } from "@common/enums";
import { PaginationDto } from "@shared/pagination/pagination.dto";

export class CreateEscalationDto {
  @ApiProperty()
  @IsUUID()
  complaintId!: string;

  @ApiProperty({ enum: EscalationReason })
  @IsEnum(EscalationReason)
  reason!: EscalationReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  escalatedToId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class ReviewEscalationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reviewNotes!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  status!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  disciplinaryRecommendation?: string;
}

export class ListEscalationsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  complaintId?: string;
}
