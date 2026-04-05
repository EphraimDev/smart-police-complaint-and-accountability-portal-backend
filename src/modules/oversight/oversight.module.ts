import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OversightController } from "./oversight.controller";
import { OversightService } from "./oversight.service";
import { EscalationRecordEntity } from "./entities/escalation-record.entity";
import { ComplaintEntity } from "@modules/complaints/entities/complaint.entity";
import { ComplaintStatusHistoryEntity } from "@modules/complaint-status-history/entities/complaint-status-history.entity";
import { AuditLogModule } from "@modules/audit-logs/audit-log.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EscalationRecordEntity,
      ComplaintEntity,
      ComplaintStatusHistoryEntity,
    ]),
    AuditLogModule,
  ],
  controllers: [OversightController],
  providers: [OversightService],
  exports: [OversightService],
})
export class OversightModule {}
