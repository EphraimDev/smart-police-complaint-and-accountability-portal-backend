import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PermissionEntity } from "@modules/users/entities/user.entity";
import { RequirePermissions } from "@common/decorators";
import { Permission } from "@common/enums";

@ApiTags("Permissions")
@ApiBearerAuth("access-token")
@Controller("permissions")
export class PermissionsController {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
  ) {}

  @Get()
  @RequirePermissions(Permission.ROLE_READ)
  @ApiOperation({ summary: "List all permissions" })
  async findAll() {
    return this.permissionRepository.find({
      order: { module: "ASC", name: "ASC" },
    });
  }
}
