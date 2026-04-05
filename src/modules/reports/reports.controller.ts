import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { ReportsService } from "./reports.service";
import { ReportFiltersDto } from "./dto/reports.dto";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { PermissionsGuard } from "@common/guards/permissions.guard";
import { RequirePermissions } from "@common/decorators";
import { Permission } from "@common/enums";

@ApiTags("reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("complaints/summary")
  @RequirePermissions(Permission.REPORT_VIEW)
  @ApiOperation({ summary: "Get complaint summary report" })
  getComplaintSummary(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getComplaintSummary(filters);
  }

  @Get("complaints/resolution")
  @RequirePermissions(Permission.REPORT_VIEW)
  @ApiOperation({ summary: "Get resolution time metrics" })
  getResolutionMetrics(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getResolutionMetrics(filters);
  }

  @Get("complaints/overdue")
  @RequirePermissions(Permission.REPORT_VIEW)
  @ApiOperation({ summary: "Get overdue complaints report" })
  getOverdueComplaints(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getOverdueComplaints(filters);
  }

  @Get("escalations")
  @RequirePermissions(Permission.REPORT_VIEW)
  @ApiOperation({ summary: "Get escalation metrics" })
  getEscalationMetrics(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getEscalationMetrics(filters);
  }

  @Get("trends")
  @RequirePermissions(Permission.REPORT_VIEW)
  @ApiOperation({ summary: "Get complaint trend data" })
  getTrendData(@Query() filters: ReportFiltersDto) {
    return this.reportsService.getTrendData(filters);
  }
}
