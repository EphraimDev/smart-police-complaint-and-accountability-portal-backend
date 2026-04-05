import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PermissionsController } from "./permissions.controller";
import { PermissionEntity } from "@modules/users/entities/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([PermissionEntity])],
  controllers: [PermissionsController],
})
export class PermissionsModule {}
