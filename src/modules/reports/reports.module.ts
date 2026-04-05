import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReportsService } from "./reports.service";
import { ReportsController } from "./reports.controller";
import { ComplaintEntity } from "@modules/complaints/entities/complaint.entity";
import { EscalationRecordEntity } from "@modules/oversight/entities/escalation-record.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([ComplaintEntity, EscalationRecordEntity]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
