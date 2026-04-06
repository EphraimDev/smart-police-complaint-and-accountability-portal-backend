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
import { PoliceStationsService } from "./police-stations.service";
import {
  CreateStationDto,
  UpdateStationDto,
  ListStationsDto,
  BulkUploadStationsResponseDto,
} from "./dto/station.dto";
import { RequirePermissions, CurrentUser } from "@common/decorators";
import { Permission } from "@common/enums";
import { RequestUser } from "@common/interfaces";

type UploadedStationCsvFile = {
  buffer: Buffer;
  originalname: string;
};

@ApiTags("Police Stations")
@ApiBearerAuth("access-token")
@Controller("police-stations")
export class PoliceStationsController {
  constructor(private readonly service: PoliceStationsService) {}

  @Post("bulk-upload")
  @UseInterceptors(FileInterceptor("file"))
  @RequirePermissions(Permission.STATION_CREATE)
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: {
          type: "string",
          format: "binary",
          description:
            "CSV with headers: code,name,address,region,parentStationId,phone,email",
        },
      },
    },
  })
  @ApiOperation({ summary: "Bulk upload police stations from a CSV file" })
  async bulkUpload(
    @UploadedFile() file: UploadedStationCsvFile,
    @CurrentUser() user: RequestUser,
  ): Promise<BulkUploadStationsResponseDto> {
    return this.service.bulkUpload(file, user.id);
  }

  @Post()
  @RequirePermissions(Permission.STATION_CREATE)
  @ApiOperation({ summary: "Create police station" })
  async create(
    @Body() dto: CreateStationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(dto, user.id);
  }

  @Get()
  @RequirePermissions(Permission.STATION_READ)
  @ApiOperation({ summary: "List police stations" })
  async findAll(@Query() filters: ListStationsDto) {
    return this.service.findAll(filters);
  }

  @Get(":id")
  @RequirePermissions(Permission.STATION_READ)
  @ApiOperation({ summary: "Get station by ID" })
  async findById(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Put(":id")
  @RequirePermissions(Permission.STATION_UPDATE)
  @ApiOperation({ summary: "Update station" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateStationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, dto, user.id);
  }
}
