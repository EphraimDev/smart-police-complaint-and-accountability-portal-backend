import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
  Headers,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { EvidenceService } from "./evidence.service";
import { CreateEvidenceDto, ListEvidenceDto } from "./dto/evidence.dto";
import { RequirePermissions, CurrentUser } from "@common/decorators";
import { Permission } from "@common/enums";
import { RequestUser } from "@common/interfaces";

@ApiTags("Evidence")
@ApiBearerAuth("access-token")
@Controller("evidence")
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Post()
  @RequirePermissions(Permission.EVIDENCE_UPLOAD)
  @ApiOperation({ summary: "Create evidence metadata record" })
  async create(
    @Body() dto: CreateEvidenceDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown";
    return this.evidenceService.create(dto, user.id, ip);
  }

  @Get()
  @RequirePermissions(Permission.EVIDENCE_READ)
  @ApiOperation({ summary: "List evidence" })
  async findAll(@Query() filters: ListEvidenceDto) {
    return this.evidenceService.findAll(filters);
  }

  @Get(":id")
  @RequirePermissions(Permission.EVIDENCE_READ)
  @ApiOperation({ summary: "Get evidence by ID" })
  async findById(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown";
    await this.evidenceService.recordAccess(id, user.id, ip);
    return this.evidenceService.findById(id);
  }

  @Get(":id/chain-of-custody")
  @RequirePermissions(Permission.EVIDENCE_READ)
  @ApiOperation({ summary: "Get evidence chain of custody" })
  async getChainOfCustody(@Param("id", ParseUUIDPipe) id: string) {
    return this.evidenceService.getChainOfCustody(id);
  }
}
