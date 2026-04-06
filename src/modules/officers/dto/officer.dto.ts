import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
} from "class-validator";
import { PaginationDto } from "@shared/pagination/pagination.dto";
import { OfficerEntity } from "../entities/officer.entity";

export class CreateOfficerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  badgeNumber!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceNumber?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  rank!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  stationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  joinedDate?: string;
}

export class UpdateOfficerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rank?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  stationId?: string;
}

export class ListOfficersDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  stationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rank?: string;
}

export class BulkUploadOfficersDto {
  @ApiProperty({ description: "Station ID to assign to all uploaded officers" })
  @IsUUID()
  @IsNotEmpty()
  stationId!: string;
}

export class BulkUploadOfficersResponseDto {
  @ApiProperty()
  totalRows!: number;

  @ApiProperty()
  successCount!: number;

  @ApiProperty()
  failureCount!: number;

  @ApiProperty({ type: "array", items: { type: "object" } })
  createdOfficers!: OfficerEntity[];

  @ApiProperty({
    type: "array",
    items: {
      type: "object",
      properties: {
        row: { type: "number" },
        badgeNumber: { type: "string", nullable: true },
        error: { type: "string" },
      },
    },
  })
  errors!: Array<{
    row: number;
    badgeNumber: string | null;
    error: string;
  }>;
}
