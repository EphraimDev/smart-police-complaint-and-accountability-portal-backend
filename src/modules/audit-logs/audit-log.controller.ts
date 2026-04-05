import { Controller, Get, Query, Param } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { AuditLogService } from "./audit-log.service";
import { RequirePermissions } from "@common/decorators";
import { Permission, AuditAction } from "@common/enums";
import { PaginatedResult } from "@shared/pagination/pagination.dto";
import { AuditLogEntity } from "./entities/audit-log.entity";

@ApiTags("Audit Logs")
@ApiBearerAuth("access-token")
@Controller("audit-logs")
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @RequirePermissions(Permission.AUDIT_READ)
  @ApiOperation({ summary: "List all audit logs" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async findAll(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
  ) {
    const [items, total] = await this.auditLogService.findAll(page, limit);
    return new PaginatedResult(items, total, page, limit);
  }

  @Get("entity/:entityType/:entityId")
  @RequirePermissions(Permission.AUDIT_READ)
  @ApiOperation({ summary: "Get audit logs by entity" })
  async findByEntity(
    @Param("entityType") entityType: string,
    @Param("entityId") entityId: string,
  ) {
    return this.auditLogService.findByEntity(entityType, entityId);
  }

  @Get("actor/:actorId")
  @RequirePermissions(Permission.AUDIT_READ)
  @ApiOperation({ summary: "Get audit logs by actor" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async findByActor(
    @Param("actorId") actorId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
  ) {
    const [items, total] = await this.auditLogService.findByActor(
      actorId,
      page,
      limit,
    );
    return new PaginatedResult(items, total, page, limit);
  }
}
