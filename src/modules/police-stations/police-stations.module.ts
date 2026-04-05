import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PoliceStationsController } from "./police-stations.controller";
import { PoliceStationsService } from "./police-stations.service";
import { PoliceStationEntity } from "./entities/police-station.entity";

@Module({
  imports: [TypeOrmModule.forFeature([PoliceStationEntity])],
  controllers: [PoliceStationsController],
  providers: [PoliceStationsService],
  exports: [PoliceStationsService],
})
export class PoliceStationsModule {}
