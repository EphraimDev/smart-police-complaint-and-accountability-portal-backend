import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ComplaintAssignmentsController } from "./complaint-assignments.controller";
import { ComplaintAssignmentsService } from "./complaint-assignments.service";
import { ComplaintAssignmentEntity } from "./entities/complaint-assignment.entity";
import { ComplaintEntity } from "@modules/complaints/entities/complaint.entity";
import { ComplaintStatusHistoryEntity } from "@modules/complaint-status-history/entities/complaint-status-history.entity";
import { AuditLogModule } from "@modules/audit-logs/audit-log.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ComplaintAssignmentEntity,
      ComplaintEntity,
      ComplaintStatusHistoryEntity,
    ]),
    AuditLogModule,
  ],
  controllers: [ComplaintAssignmentsController],
  providers: [ComplaintAssignmentsService],
  exports: [ComplaintAssignmentsService],
})
export class ComplaintAssignmentsModule {}
