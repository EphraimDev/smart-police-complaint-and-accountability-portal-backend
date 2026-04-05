import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { EscalationRecordEntity } from "./entities/escalation-record.entity";
import { ComplaintEntity } from "@modules/complaints/entities/complaint.entity";
import { ComplaintStatusHistoryEntity } from "@modules/complaint-status-history/entities/complaint-status-history.entity";
import {
  CreateEscalationDto,
  ReviewEscalationDto,
  ListEscalationsDto,
} from "./dto/oversight.dto";
import { AuditLogService } from "@modules/audit-logs/audit-log.service";
import { AuditAction, ComplaintStatus } from "@common/enums";
import { TransactionHelper } from "@shared/database";
import { PaginatedResult } from "@shared/pagination/pagination.dto";

@Injectable()
export class OversightService {
  constructor(
    @InjectRepository(EscalationRecordEntity)
    private readonly escalationRepository: Repository<EscalationRecordEntity>,
    @InjectRepository(ComplaintEntity)
    private readonly complaintRepository: Repository<ComplaintEntity>,
    @InjectRepository(ComplaintStatusHistoryEntity)
    private readonly statusHistoryRepository: Repository<ComplaintStatusHistoryEntity>,
    private readonly dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
  ) {}

  async escalate(
    dto: CreateEscalationDto,
    actorId: string,
  ): Promise<EscalationRecordEntity> {
    return TransactionHelper.run(this.dataSource, async (qr) => {
      const complaint = await qr.manager.findOne(ComplaintEntity, {
        where: { id: dto.complaintId },
      });
      if (!complaint) throw new NotFoundException("Complaint not found");

      const escalation = qr.manager.create(EscalationRecordEntity, {
        complaintId: dto.complaintId,
        escalatedById: actorId,
        escalatedToId: dto.escalatedToId ?? null,
        reason: dto.reason,
        description: dto.description ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        status: "pending",
        createdBy: actorId,
      });
      const saved = await qr.manager.save(escalation);

      // Update complaint status
      const previousStatus = complaint.status;
      complaint.status = ComplaintStatus.ESCALATED;
      complaint.updatedBy = actorId;
      await qr.manager.save(complaint);

      // Status history
      const history = qr.manager.create(ComplaintStatusHistoryEntity, {
        complaintId: dto.complaintId,
        previousStatus,
        newStatus: ComplaintStatus.ESCALATED,
        changedById: actorId,
        reason: `Escalated: ${dto.reason}`,
      });
      await qr.manager.save(history);

      await this.auditLogService.log({
        actorId,
        action: AuditAction.COMPLAINT_ESCALATED,
        entityType: "escalation",
        entityId: saved.id,
        afterState: { complaintId: dto.complaintId, reason: dto.reason },
      });

      return saved;
    });
  }

  async review(
    id: string,
    dto: ReviewEscalationDto,
    actorId: string,
  ): Promise<EscalationRecordEntity> {
    const escalation = await this.escalationRepository.findOne({
      where: { id },
    });
    if (!escalation) throw new NotFoundException("Escalation not found");

    escalation.reviewNotes = dto.reviewNotes;
    escalation.status = dto.status;
    escalation.reviewedById = actorId;
    escalation.reviewedAt = new Date();
    escalation.disciplinaryRecommendation =
      dto.disciplinaryRecommendation ?? null;
    escalation.updatedBy = actorId;

    const saved = await this.escalationRepository.save(escalation);

    await this.auditLogService.log({
      actorId,
      action: AuditAction.OVERSIGHT_REVIEW,
      entityType: "escalation",
      entityId: id,
      afterState: { status: dto.status },
    });

    return saved;
  }

  async findAll(
    filters: ListEscalationsDto,
  ): Promise<PaginatedResult<EscalationRecordEntity>> {
    const qb = this.escalationRepository.createQueryBuilder("e");

    if (filters.status)
      qb.andWhere("e.status = :status", { status: filters.status });
    if (filters.complaintId)
      qb.andWhere("e.complaintId = :cid", { cid: filters.complaintId });

    qb.orderBy("e.createdAt", "DESC");

    const [items, total] = await qb
      .skip(filters.skip)
      .take(filters.limit)
      .getManyAndCount();
    return new PaginatedResult(items, total, filters.page, filters.limit);
  }
}
