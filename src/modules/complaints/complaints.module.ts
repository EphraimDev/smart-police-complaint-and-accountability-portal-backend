import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { ComplaintsController } from "./complaints.controller";
import { ComplaintsService } from "./complaints.service";
import {
  ComplaintEntity,
  ComplaintNoteEntity,
} from "./entities/complaint.entity";
import { ComplaintStatusHistoryEntity } from "@modules/complaint-status-history/entities/complaint-status-history.entity";
import { ComplaintOfficerEntity } from "@modules/officers/entities/officer.entity";
import { AuditLogModule } from "@modules/audit-logs/audit-log.module";
import { QUEUE_NAMES } from "@common/constants";
import {
  EvidenceEntity,
  EvidenceChainOfCustodyEntity,
} from "@modules/evidence/entities/evidence.entity";
import { LocalStorageProvider } from "@integrations/storage";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ComplaintEntity,
      ComplaintNoteEntity,
      ComplaintStatusHistoryEntity,
      ComplaintOfficerEntity,
      EvidenceEntity,
      EvidenceChainOfCustodyEntity,
    ]),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.AI_ANALYSIS },
      { name: QUEUE_NAMES.NOTIFICATIONS },
    ),
    AuditLogModule,
  ],
  controllers: [ComplaintsController],
  providers: [ComplaintsService, LocalStorageProvider],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
