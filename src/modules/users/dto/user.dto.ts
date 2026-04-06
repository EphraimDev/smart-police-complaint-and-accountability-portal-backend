import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  IsUUID,
  MinLength,
} from "class-validator";
import { APP_CONSTANTS } from "@common/constants";
import { PaginationDto } from "@shared/pagination/pagination.dto";

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  // @ApiProperty({ minLength: APP_CONSTANTS.MIN_PASSWORD_LENGTH })
  // @IsString()
  // @MinLength(APP_CONSTANTS.MIN_PASSWORD_LENGTH)
  // password!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  roleIds?: string[];
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
}

export class AssignRolesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID("4", { each: true })
  roleIds!: string[];
}

export class ListUsersDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;
}

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  roles!: string[];

  @ApiProperty()
  createdAt!: Date;
}

export class BulkUploadUsersResponseDto {
  @ApiProperty()
  totalRows!: number;

  @ApiProperty()
  successCount!: number;

  @ApiProperty()
  failureCount!: number;

  @ApiProperty({ type: [UserResponseDto] })
  createdUsers!: UserResponseDto[];

  @ApiProperty({
    type: "array",
    items: {
      type: "object",
      properties: {
        row: { type: "number" },
        email: { type: "string", nullable: true },
        error: { type: "string" },
      },
    },
  })
  errors!: Array<{
    row: number;
    email: string | null;
    error: string;
  }>;
}
