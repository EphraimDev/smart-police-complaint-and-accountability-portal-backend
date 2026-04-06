import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OfficersController } from "./officers.controller";
import { OfficersService } from "./officers.service";
import {
  OfficerEntity,
  ComplaintOfficerEntity,
} from "./entities/officer.entity";
import { AuditLogModule } from "@modules/audit-logs/audit-log.module";
import { PoliceStationEntity } from "@modules/police-stations/entities/police-station.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OfficerEntity,
      ComplaintOfficerEntity,
      PoliceStationEntity,
    ]),
    AuditLogModule,
  ],
  controllers: [OfficersController],
  providers: [OfficersService],
  exports: [OfficersService],
})
export class OfficersModule {}
