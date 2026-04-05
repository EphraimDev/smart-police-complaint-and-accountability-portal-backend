import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PoliceStationsService } from "./police-stations.service";
import {
  CreateStationDto,
  UpdateStationDto,
  ListStationsDto,
} from "./dto/station.dto";
import { RequirePermissions, CurrentUser } from "@common/decorators";
import { Permission } from "@common/enums";
import { RequestUser } from "@common/interfaces";

@ApiTags("Police Stations")
@ApiBearerAuth("access-token")
@Controller("police-stations")
export class PoliceStationsController {
  constructor(private readonly service: PoliceStationsService) {}

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
