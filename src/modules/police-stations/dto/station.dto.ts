import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { PaginationDto } from "@shared/pagination/pagination.dto";

export class CreateStationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentStationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;
}

export class UpdateStationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  commandingOfficerId?: string;
}

export class ListStationsDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;
}
