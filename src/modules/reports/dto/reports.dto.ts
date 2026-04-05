import { IsOptional, IsString, IsDateString, IsEnum } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class ReportFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  officerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    enum: ["daily", "weekly", "monthly", "quarterly", "yearly"],
  })
  @IsOptional()
  @IsString()
  period?: string;
}
