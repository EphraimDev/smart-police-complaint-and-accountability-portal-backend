import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { OfficersService } from "./officers.service";
import {
  CreateOfficerDto,
  UpdateOfficerDto,
  ListOfficersDto,
  BulkUploadOfficersDto,
  BulkUploadOfficersResponseDto,
} from "./dto/officer.dto";
import { RequirePermissions, CurrentUser } from "@common/decorators";
import { Permission } from "@common/enums";
import { RequestUser } from "@common/interfaces";

type UploadedOfficerCsvFile = {
  buffer: Buffer;
  originalname: string;
};

@ApiTags("Officers")
@ApiBearerAuth("access-token")
@Controller("officers")
export class OfficersController {
  constructor(private readonly officersService: OfficersService) {}

  @Post("bulk-upload")
  @UseInterceptors(FileInterceptor("file"))
  @RequirePermissions(Permission.OFFICER_CREATE)
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file", "stationId"],
      properties: {
        file: {
          type: "string",
          format: "binary",
          description:
            "CSV with headers: badgeNumber,serviceNumber,firstName,lastName,rank,unit,joinedDate",
        },
        stationId: {
          type: "string",
          format: "uuid",
          description: "Station ID to assign to all officers in the upload",
        },
      },
    },
  })
  @ApiOperation({ summary: "Bulk upload officers from a CSV file" })
  async bulkUpload(
    @UploadedFile() file: UploadedOfficerCsvFile,
    @Body() body: BulkUploadOfficersDto,
    @CurrentUser() user: RequestUser,
  ): Promise<BulkUploadOfficersResponseDto> {
    return this.officersService.bulkUpload(file, body.stationId, user.id);
  }

  @Post()
  @RequirePermissions(Permission.OFFICER_CREATE)
  @ApiOperation({ summary: "Create officer record" })
  async create(
    @Body() dto: CreateOfficerDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.officersService.create(dto, user.id);
  }

  @Get()
  @RequirePermissions(Permission.OFFICER_READ)
  @ApiOperation({ summary: "List officers" })
  async findAll(@Query() filters: ListOfficersDto) {
    return this.officersService.findAll(filters);
  }

  @Get(":id")
  @RequirePermissions(Permission.OFFICER_READ)
  @ApiOperation({ summary: "Get officer by ID" })
  async findById(@Param("id", ParseUUIDPipe) id: string) {
    return this.officersService.findById(id);
  }

  @Put(":id")
  @RequirePermissions(Permission.OFFICER_UPDATE)
  @ApiOperation({ summary: "Update officer" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateOfficerDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.officersService.update(id, dto, user.id);
  }
}
