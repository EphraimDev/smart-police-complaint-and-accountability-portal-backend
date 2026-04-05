import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";
import { EvidenceType, EvidenceAccessLevel } from "@common/enums";
import { PaginationDto } from "@shared/pagination/pagination.dto";

export class CreateEvidenceDto {
  @ApiProperty()
  @IsUUID()
  complaintId!: string;

  @ApiProperty({ enum: EvidenceType })
  @IsEnum(EvidenceType)
  evidenceType!: EvidenceType;

  @ApiPropertyOptional({ enum: EvidenceAccessLevel })
  @IsOptional()
  @IsEnum(EvidenceAccessLevel)
  accessLevel?: EvidenceAccessLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Original file name" })
  @IsString()
  @IsNotEmpty()
  originalName!: string;

  @ApiProperty({ description: "MIME type" })
  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @ApiProperty({ description: "File size in bytes" })
  fileSize!: number;

  @ApiProperty({ description: "SHA-256 hash of the file" })
  @IsString()
  @IsNotEmpty()
  fileHash!: string;

  @ApiProperty({ description: "Storage path / key" })
  @IsString()
  @IsNotEmpty()
  storagePath!: string;
}

export class ListEvidenceDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  complaintId?: string;

  @ApiPropertyOptional({ enum: EvidenceType })
  @IsOptional()
  @IsEnum(EvidenceType)
  evidenceType?: EvidenceType;
}
