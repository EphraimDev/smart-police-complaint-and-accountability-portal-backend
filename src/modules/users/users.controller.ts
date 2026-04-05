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
import { UsersService } from "./users.service";
import {
  CreateUserDto,
  UpdateUserDto,
  ListUsersDto,
  AssignRolesDto,
} from "./dto/user.dto";
import { RequirePermissions, CurrentUser } from "@common/decorators";
import { Permission } from "@common/enums";
import { RequestUser } from "@common/interfaces";

@ApiTags("Users")
@ApiBearerAuth("access-token")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions(Permission.USER_CREATE)
  @ApiOperation({ summary: "Create a new user" })
  async create(@Body() dto: CreateUserDto, @CurrentUser() user: RequestUser) {
    return this.usersService.create(dto, user.id);
  }

  @Get()
  @RequirePermissions(Permission.USER_READ)
  @ApiOperation({ summary: "List users with filters" })
  async findAll(@Query() filters: ListUsersDto) {
    return this.usersService.findAll(filters);
  }

  @Get("me")
  @ApiOperation({ summary: "Get current user profile" })
  async getProfile(@CurrentUser() user: RequestUser) {
    return this.usersService.findById(user.id);
  }

  @Get(":id")
  @RequirePermissions(Permission.USER_READ)
  @ApiOperation({ summary: "Get user by ID" })
  async findById(@Param("id", ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Put(":id")
  @RequirePermissions(Permission.USER_UPDATE)
  @ApiOperation({ summary: "Update user" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.update(id, dto, user.id);
  }

  @Patch(":id/deactivate")
  @RequirePermissions(Permission.USER_DEACTIVATE)
  @ApiOperation({ summary: "Deactivate user" })
  async deactivate(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.usersService.deactivate(id, user.id);
    return { message: "User deactivated" };
  }

  @Patch(":id/activate")
  @RequirePermissions(Permission.USER_DEACTIVATE)
  @ApiOperation({ summary: "Activate user" })
  async activate(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.usersService.activate(id, user.id);
    return { message: "User activated" };
  }

  @Patch(":id/roles")
  @RequirePermissions(Permission.USER_ASSIGN_ROLE)
  @ApiOperation({ summary: "Assign roles to user" })
  async assignRoles(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignRolesDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.assignRoles(id, dto, user.id);
  }
}
