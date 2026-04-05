import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ComplaintsService } from "./complaints.service";
import {
  CreateComplaintDto,
  UpdateComplaintDto,
  UpdateComplaintStatusDto,
  ListComplaintsDto,
  TrackComplaintDto,
  AddComplaintNoteDto,
} from "./dto/complaint.dto";
import {
  RequirePermissions,
  CurrentUser,
  Public,
  Idempotent,
} from "@common/decorators";
import { Permission } from "@common/enums";
import { RequestUser } from "@common/interfaces";

@ApiTags("Complaints")
@ApiBearerAuth("access-token")
@Controller("complaints")
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  @Idempotent()
  @RequirePermissions(Permission.COMPLAINT_CREATE)
  @ApiOperation({ summary: "Create a complaint" })
  async create(
    @Body() dto: CreateComplaintDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.complaintsService.create(dto, user.id);
  }

  @Get()
  @RequirePermissions(Permission.COMPLAINT_READ)
  @ApiOperation({ summary: "List complaints with filters" })
  async findAll(@Query() filters: ListComplaintsDto) {
    return this.complaintsService.findAll(filters);
  }

  @Public()
  @Post("track")
  @ApiOperation({ summary: "Track complaint by reference number (public)" })
  async track(@Body() dto: TrackComplaintDto) {
    return this.complaintsService.findByReference(dto.reference);
  }

  @Get(":id")
  @RequirePermissions(Permission.COMPLAINT_READ)
  @ApiOperation({ summary: "Get complaint by ID" })
  async findById(@Param("id", ParseUUIDPipe) id: string) {
    return this.complaintsService.findById(id);
  }

  @Put(":id")
  @RequirePermissions(Permission.COMPLAINT_UPDATE)
  @ApiOperation({ summary: "Update complaint details" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateComplaintDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.complaintsService.update(id, dto, user.id);
  }

  @Patch(":id/status")
  @RequirePermissions(Permission.COMPLAINT_UPDATE)
  @ApiOperation({ summary: "Update complaint status" })
  async updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateComplaintStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.complaintsService.updateStatus(id, dto, user.id);
  }

  @Get(":id/timeline")
  @RequirePermissions(Permission.COMPLAINT_READ)
  @ApiOperation({ summary: "Get complaint status timeline" })
  async getTimeline(@Param("id", ParseUUIDPipe) id: string) {
    return this.complaintsService.getTimeline(id);
  }

  @Post(":id/notes")
  @RequirePermissions(Permission.COMPLAINT_UPDATE)
  @ApiOperation({ summary: "Add note to complaint" })
  async addNote(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AddComplaintNoteDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.complaintsService.addNote(id, dto, user.id);
  }

  @Get(":id/notes")
  @RequirePermissions(Permission.COMPLAINT_READ)
  @ApiOperation({ summary: "Get complaint notes" })
  async getNotes(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const hasInternalAccess = user.permissions.includes(
      Permission.COMPLAINT_UPDATE,
    );
    return this.complaintsService.getNotes(id, hasInternalAccess);
  }
}
