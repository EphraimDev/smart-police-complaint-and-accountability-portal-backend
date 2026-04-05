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
import { OfficersService } from "./officers.service";
import {
  CreateOfficerDto,
  UpdateOfficerDto,
  ListOfficersDto,
} from "./dto/officer.dto";
import { RequirePermissions, CurrentUser } from "@common/decorators";
import { Permission } from "@common/enums";
import { RequestUser } from "@common/interfaces";

@ApiTags("Officers")
@ApiBearerAuth("access-token")
@Controller("officers")
export class OfficersController {
  constructor(private readonly officersService: OfficersService) {}

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
