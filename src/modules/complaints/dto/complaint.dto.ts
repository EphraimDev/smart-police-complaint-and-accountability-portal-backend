import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
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

function emptyStringToUndefined(value: unknown): unknown {
  return value === "" ? undefined : value;
}

function transformBoolean(value: unknown): unknown {
  if (value === "" || value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return value;
}

function transformStringArray(value: unknown): string[] | undefined {
  if (value === "" || value === undefined || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => transformStringArray(item) ?? []);
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : undefined;
    } catch {
      return undefined;
    }
  }

  if (trimmed.includes(",")) {
    return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [trimmed];
}

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
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsOptional()
  @IsEnum(ComplaintSeverity)
  severity?: ComplaintSeverity;

  @ApiPropertyOptional({ enum: ComplaintSource })
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsOptional()
  @IsEnum(ComplaintSource)
  source?: ComplaintSource;

  @ApiPropertyOptional({ enum: ComplaintChannel })
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsOptional()
  @IsEnum(ComplaintChannel)
  channel?: ComplaintChannel;

  @ApiPropertyOptional()
  @Transform(({ value }) => transformBoolean(value))
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsOptional()
  @IsString()
  complainantName?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsOptional()
  @IsString()
  complainantEmail?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsOptional()
  @IsString()
  complainantPhone?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsOptional()
  @IsString()
  complainantAddress?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsOptional()
  @IsDateString()
  incidentDate?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsOptional()
  @IsString()
  incidentLocation?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsOptional()
  @IsUUID()
  stationId?: string;

  @ApiPropertyOptional({ description: "Officer IDs involved" })
  @Transform(({ value }) => transformStringArray(value))
  @IsOptional()
  @IsUUID("4", { each: true })
  officerIds?: string[];

  @ApiPropertyOptional({ description: "Idempotency key for safe retries" })
  @Transform(({ value }) => emptyStringToUndefined(value))
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
