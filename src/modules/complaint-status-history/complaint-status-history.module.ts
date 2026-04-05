import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ComplaintStatusHistoryController } from "./complaint-status-history.controller";
import { ComplaintStatusHistoryEntity } from "./entities/complaint-status-history.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ComplaintStatusHistoryEntity])],
  controllers: [ComplaintStatusHistoryController],
  exports: [TypeOrmModule],
})
export class ComplaintStatusHistoryModule {}
