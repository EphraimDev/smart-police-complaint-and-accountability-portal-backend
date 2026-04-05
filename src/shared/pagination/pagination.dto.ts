import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { APP_CONSTANTS } from "@common/constants";

export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(APP_CONSTANTS.MAX_PAGE_SIZE)
  limit: number = APP_CONSTANTS.DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({ description: "Sort field" })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ["ASC", "DESC"], default: "DESC" })
  @IsOptional()
  @IsString()
  sortOrder?: "ASC" | "DESC" = "DESC";

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}

export class PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;

  constructor(page: number, limit: number, totalItems: number) {
    this.page = page;
    this.limit = limit;
    this.totalItems = totalItems;
    this.totalPages = Math.ceil(totalItems / limit);
    this.hasNextPage = page < this.totalPages;
    this.hasPreviousPage = page > 1;
  }
}

export class PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;

  constructor(data: T[], totalItems: number, page: number, limit: number) {
    this.data = data;
    this.meta = new PaginationMeta(page, limit, totalItems);
  }
}
