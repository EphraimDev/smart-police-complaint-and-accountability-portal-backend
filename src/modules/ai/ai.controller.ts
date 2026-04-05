import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AiService } from "./ai.service";
import {
  RequestAnalysisDto,
  ReviewAnalysisDto,
  ListAnalysesDto,
} from "./dto/ai.dto";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { PermissionsGuard } from "@common/guards/permissions.guard";
import { RequirePermissions, CurrentUser } from "@common/decorators";
import { Permission } from "@common/enums";
import { RequestUser } from "@common/interfaces";

@ApiTags("ai")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("ai/analyses")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post()
  @RequirePermissions(Permission.AI_REQUEST_ANALYSIS)
  @ApiOperation({ summary: "Request AI analysis for a complaint" })
  requestAnalysis(
    @Body() dto: RequestAnalysisDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.aiService.requestAnalysis(dto, user.id);
  }

  @Get()
  @RequirePermissions(Permission.AI_VIEW_RESULTS)
  @ApiOperation({ summary: "List AI analysis results" })
  findAll(@Query() dto: ListAnalysesDto) {
    return this.aiService.findAll(dto);
  }

  @Get(":id")
  @RequirePermissions(Permission.AI_VIEW_RESULTS)
  @ApiOperation({ summary: "Get AI analysis result by ID" })
  findById(@Param("id", ParseUUIDPipe) id: string) {
    return this.aiService.findById(id);
  }

  @Patch(":id/review")
  @RequirePermissions(Permission.AI_REVIEW)
  @ApiOperation({ summary: "Review/approve an AI analysis result" })
  reviewAnalysis(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReviewAnalysisDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.aiService.reviewAnalysis(id, dto, user.id);
  }
}
