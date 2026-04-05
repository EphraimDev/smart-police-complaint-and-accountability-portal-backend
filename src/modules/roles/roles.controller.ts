import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { RolesService } from "./roles.service";
import { CreateRoleDto, UpdateRoleDto } from "./dto/role.dto";
import { RequirePermissions, CurrentUser } from "@common/decorators";
import { Permission } from "@common/enums";
import { RequestUser } from "@common/interfaces";

@ApiTags("Roles")
@ApiBearerAuth("access-token")
@Controller("roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions(Permission.ROLE_CREATE)
  @ApiOperation({ summary: "Create a role" })
  async create(@Body() dto: CreateRoleDto, @CurrentUser() user: RequestUser) {
    return this.rolesService.create(dto, user.id);
  }

  @Get()
  @RequirePermissions(Permission.ROLE_READ)
  @ApiOperation({ summary: "List all roles" })
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get(":id")
  @RequirePermissions(Permission.ROLE_READ)
  @ApiOperation({ summary: "Get a role by ID" })
  async findById(@Param("id", ParseUUIDPipe) id: string) {
    return this.rolesService.findById(id);
  }

  @Put(":id")
  @RequirePermissions(Permission.ROLE_UPDATE)
  @ApiOperation({ summary: "Update a role" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.rolesService.update(id, dto, user.id);
  }

  @Delete(":id")
  @RequirePermissions(Permission.ROLE_DELETE)
  @ApiOperation({ summary: "Delete a role" })
  async delete(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.rolesService.delete(id, user.id);
    return { message: "Role deleted" };
  }
}
