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
import { ComplaintAssignmentsService } from "./complaint-assignments.service";
import {
  CreateAssignmentDto,
  ReassignDto,
  UpdateAssignmentStatusDto,
  ListAssignmentsDto,
} from "./dto/assignment.dto";
import { RequirePermissions, CurrentUser } from "@common/decorators";
import { Permission } from "@common/enums";
import { RequestUser } from "@common/interfaces";

@ApiTags("Complaint Assignments")
@ApiBearerAuth("access-token")
@Controller("complaint-assignments")
export class ComplaintAssignmentsController {
  constructor(private readonly service: ComplaintAssignmentsService) {}

  @Post()
  @RequirePermissions(Permission.COMPLAINT_ASSIGN)
  @ApiOperation({ summary: "Assign complaint to investigator" })
  async create(
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(dto, user.id);
  }

  @Get()
  @RequirePermissions(Permission.COMPLAINT_READ)
  @ApiOperation({ summary: "List assignments" })
  async findAll(@Query() filters: ListAssignmentsDto) {
    return this.service.findAll(filters);
  }

  @Get("complaint/:complaintId")
  @RequirePermissions(Permission.COMPLAINT_READ)
  @ApiOperation({ summary: "Get assignments for a complaint" })
  async findByComplaint(
    @Param("complaintId", ParseUUIDPipe) complaintId: string,
  ) {
    return this.service.findByComplaint(complaintId);
  }

  @Patch(":id/reassign")
  @RequirePermissions(Permission.COMPLAINT_ASSIGN)
  @ApiOperation({ summary: "Reassign complaint" })
  async reassign(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReassignDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.reassign(id, dto, user.id);
  }

  @Patch(":id/status")
  @RequirePermissions(Permission.COMPLAINT_UPDATE)
  @ApiOperation({ summary: "Update assignment status" })
  async updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssignmentStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.updateStatus(id, dto, user.id);
  }
}
