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
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
} from "@nestjs/swagger";
import { FilesInterceptor } from "@nestjs/platform-express";
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
  ClientIp,
} from "@common/decorators";
import { Permission } from "@common/enums";
import { RequestUser } from "@common/interfaces";

type UploadedComplaintFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@ApiTags("Complaints")
@ApiBearerAuth("access-token")
@Controller("complaints")
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Public()
  @Post()
  @Idempotent()
  @UseInterceptors(FilesInterceptor("attachments", 10))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["title", "description", "category"],
      properties: {
        title: { type: "string", maxLength: 500 },
        description: { type: "string" },
        category: { type: "string" },
        severity: { type: "string" },
        source: { type: "string" },
        channel: { type: "string" },
        isAnonymous: { type: "boolean" },
        complainantName: { type: "string" },
        complainantEmail: { type: "string" },
        complainantPhone: { type: "string" },
        complainantAddress: { type: "string" },
        incidentDate: { type: "string", format: "date" },
        incidentLocation: { type: "string" },
        stationId: { type: "string", format: "uuid" },
        officerIds: {
          type: "array",
          items: { type: "string", format: "uuid" },
        },
        idempotencyKey: { type: "string" },
        attachments: {
          type: "array",
          items: { type: "string", format: "binary" },
        },
      },
    },
  })
  @ApiOperation({
    summary: "Create a complaint with optional authentication and file uploads",
  })
  async create(
    @Body() dto: CreateComplaintDto,
    @UploadedFiles() attachments: UploadedComplaintFile[] = [],
    @CurrentUser() user?: RequestUser,
    @ClientIp() ipAddress?: string,
  ) {
    return this.complaintsService.create(
      dto,
      user?.id ?? null,
      attachments,
      ipAddress ?? "unknown",
    );
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
  async findById(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.complaintsService.findById(id, user);
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
