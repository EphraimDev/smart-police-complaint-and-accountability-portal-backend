import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { OversightService } from "./oversight.service";
import {
  CreateEscalationDto,
  ReviewEscalationDto,
  ListEscalationsDto,
} from "./dto/oversight.dto";
import { RequirePermissions, CurrentUser } from "@common/decorators";
import { Permission } from "@common/enums";
import { RequestUser } from "@common/interfaces";

@ApiTags("Oversight")
@ApiBearerAuth("access-token")
@Controller("oversight")
export class OversightController {
  constructor(private readonly oversightService: OversightService) {}

  @Post("escalations")
  @RequirePermissions(Permission.COMPLAINT_ESCALATE)
  @ApiOperation({ summary: "Escalate a complaint" })
  async escalate(
    @Body() dto: CreateEscalationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.oversightService.escalate(dto, user.id);
  }

  @Get("escalations")
  @RequirePermissions(Permission.OVERSIGHT_VIEW)
  @ApiOperation({ summary: "List escalations" })
  async findAll(@Query() filters: ListEscalationsDto) {
    return this.oversightService.findAll(filters);
  }

  @Patch("escalations/:id/review")
  @RequirePermissions(Permission.OVERSIGHT_ACTION)
  @ApiOperation({ summary: "Review escalation" })
  async review(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReviewEscalationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.oversightService.review(id, dto, user.id);
  }
}
