import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";
import {
  RoleEntity,
  PermissionEntity,
} from "@modules/users/entities/user.entity";
import { AuditLogModule } from "@modules/audit-logs/audit-log.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleEntity, PermissionEntity]),
    AuditLogModule,
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
