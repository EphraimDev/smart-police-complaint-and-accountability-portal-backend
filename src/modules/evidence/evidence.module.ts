import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EvidenceController } from "./evidence.controller";
import { EvidenceService } from "./evidence.service";
import {
  EvidenceEntity,
  EvidenceChainOfCustodyEntity,
} from "./entities/evidence.entity";
import { AuditLogModule } from "@modules/audit-logs/audit-log.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([EvidenceEntity, EvidenceChainOfCustodyEntity]),
    AuditLogModule,
  ],
  controllers: [EvidenceController],
  providers: [EvidenceService],
  exports: [EvidenceService],
})
export class EvidenceModule {}
