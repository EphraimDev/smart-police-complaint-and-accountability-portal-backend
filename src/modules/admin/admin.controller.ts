import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { PermissionsGuard } from "@common/guards/permissions.guard";
import { RequirePermissions } from "@common/decorators";
import { Permission } from "@common/enums";

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("dashboard")
  @RequirePermissions(Permission.ADMIN_DASHBOARD)
  @ApiOperation({ summary: "Get admin dashboard summary" })
  getDashboardSummary() {
    return this.adminService.getDashboardSummary();
  }

  @Get("system-health")
  @RequirePermissions(Permission.ADMIN_CONFIG)
  @ApiOperation({ summary: "Get system health metrics" })
  getSystemHealth() {
    return this.adminService.getSystemHealth();
  }
}
