import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsUUID,
  IsDateString,
  MaxLength,
} from "class-validator";
import {
  ComplaintCategory,
  ComplaintSeverity,
  ComplaintSource,
  ComplaintChannel,
  ComplaintStatus,
} from "@common/enums";
import { PaginationDto } from "@shared/pagination/pagination.dto";

export class CreateComplaintDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ enum: ComplaintCategory })
  @IsEnum(ComplaintCategory)
  category!: ComplaintCategory;

  @ApiPropertyOptional({ enum: ComplaintSeverity })
  @IsOptional()
  @IsEnum(ComplaintSeverity)
  severity?: ComplaintSeverity;

  @ApiPropertyOptional({ enum: ComplaintSource })
  @IsOptional()
  @IsEnum(ComplaintSource)
  source?: ComplaintSource;

  @ApiPropertyOptional({ enum: ComplaintChannel })
  @IsOptional()
  @IsEnum(ComplaintChannel)
  channel?: ComplaintChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  complainantName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  complainantEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  complainantPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  complainantAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  incidentDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  incidentLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  stationId?: string;

  @ApiPropertyOptional({ description: "Officer IDs involved" })
  @IsOptional()
  @IsUUID("4", { each: true })
  officerIds?: string[];

  @ApiPropertyOptional({ description: "Idempotency key for safe retries" })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class UpdateComplaintDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ComplaintSeverity })
  @IsOptional()
  @IsEnum(ComplaintSeverity)
  severity?: ComplaintSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  incidentLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  stationId?: string;
}

export class UpdateComplaintStatusDto {
  @ApiProperty({ enum: ComplaintStatus })
  @IsEnum(ComplaintStatus)
  status!: ComplaintStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasonCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolutionSummary?: string;
}

export class ListComplaintsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ComplaintStatus })
  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @ApiPropertyOptional({ enum: ComplaintCategory })
  @IsOptional()
  @IsEnum(ComplaintCategory)
  category?: ComplaintCategory;

  @ApiPropertyOptional({ enum: ComplaintSeverity })
  @IsOptional()
  @IsEnum(ComplaintSeverity)
  severity?: ComplaintSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  stationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  officerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedInvestigatorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOverdue?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEscalated?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class TrackComplaintDto {
  @ApiProperty({ description: "Complaint reference number or tracking token" })
  @IsString()
  @IsNotEmpty()
  reference!: string;
}

export class AddComplaintNoteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  noteType?: string;
}
