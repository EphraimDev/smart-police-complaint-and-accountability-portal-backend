import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import {
  UserEntity,
  RefreshTokenEntity,
} from "@modules/users/entities/user.entity";
import { AuditLogModule } from "@modules/audit-logs/audit-log.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, RefreshTokenEntity]),
    AuditLogModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
