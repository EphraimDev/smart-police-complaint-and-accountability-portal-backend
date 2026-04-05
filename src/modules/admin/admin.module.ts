import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";
import { ComplaintEntity } from "@modules/complaints/entities/complaint.entity";
import { UserEntity } from "@modules/users/entities/user.entity";
import { OfficerEntity } from "@modules/officers/entities/officer.entity";
import { PoliceStationEntity } from "@modules/police-stations/entities/police-station.entity";
import { EscalationRecordEntity } from "@modules/oversight/entities/escalation-record.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ComplaintEntity,
      UserEntity,
      OfficerEntity,
      PoliceStationEntity,
      EscalationRecordEntity,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
