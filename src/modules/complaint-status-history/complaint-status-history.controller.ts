import { Controller, Get, Param, Query, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ComplaintStatusHistoryEntity } from "./entities/complaint-status-history.entity";
import { RequirePermissions } from "@common/decorators";
import { Permission } from "@common/enums";

@ApiTags("Complaint Status History")
@ApiBearerAuth("access-token")
@Controller("complaint-status-history")
export class ComplaintStatusHistoryController {
  constructor(
    @InjectRepository(ComplaintStatusHistoryEntity)
    private readonly repository: Repository<ComplaintStatusHistoryEntity>,
  ) {}

  @Get(":complaintId")
  @RequirePermissions(Permission.COMPLAINT_READ)
  @ApiOperation({ summary: "Get full status history for a complaint" })
  async findByComplaint(
    @Param("complaintId", ParseUUIDPipe) complaintId: string,
  ) {
    return this.repository.find({
      where: { complaintId },
      order: { createdAt: "ASC" },
      relations: { changedBy: true },
      select: {
        id: true,
        complaintId: true,
        previousStatus: true,
        newStatus: true,
        changedById: true,
        reasonCode: true,
        reason: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        changedBy: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    });
  }
}
