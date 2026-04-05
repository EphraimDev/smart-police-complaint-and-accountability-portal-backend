import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsBoolean,
} from "class-validator";
import { AssignmentStatus } from "@common/enums";
import { PaginationDto } from "@shared/pagination/pagination.dto";

export class CreateAssignmentDto {
  @ApiProperty()
  @IsUUID()
  complaintId!: string;

  @ApiProperty()
  @IsUUID()
  assigneeId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignmentReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  slaDueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSupervisorOverride?: boolean;
}

export class ReassignDto {
  @ApiProperty()
  @IsUUID()
  newAssigneeId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  slaDueDate?: string;
}

export class UpdateAssignmentStatusDto {
  @ApiProperty({ enum: AssignmentStatus })
  @IsEnum(AssignmentStatus)
  status!: AssignmentStatus;
}

export class ListAssignmentsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  complaintId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ enum: AssignmentStatus })
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;
}
