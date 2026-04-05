import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { ComplaintAssignmentEntity } from "./entities/complaint-assignment.entity";
import { ComplaintEntity } from "@modules/complaints/entities/complaint.entity";
import { ComplaintStatusHistoryEntity } from "@modules/complaint-status-history/entities/complaint-status-history.entity";
import {
  CreateAssignmentDto,
  ReassignDto,
  UpdateAssignmentStatusDto,
  ListAssignmentsDto,
} from "./dto/assignment.dto";
import { AuditLogService } from "@modules/audit-logs/audit-log.service";
import { AuditAction, AssignmentStatus, ComplaintStatus } from "@common/enums";
import { TransactionHelper } from "@shared/database";
import { PaginatedResult } from "@shared/pagination/pagination.dto";

@Injectable()
export class ComplaintAssignmentsService {
  private readonly logger = new Logger(ComplaintAssignmentsService.name);

  constructor(
    @InjectRepository(ComplaintAssignmentEntity)
    private readonly assignmentRepository: Repository<ComplaintAssignmentEntity>,
    @InjectRepository(ComplaintEntity)
    private readonly complaintRepository: Repository<ComplaintEntity>,
    @InjectRepository(ComplaintStatusHistoryEntity)
    private readonly statusHistoryRepository: Repository<ComplaintStatusHistoryEntity>,
    private readonly dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(
    dto: CreateAssignmentDto,
    actorId: string,
  ): Promise<ComplaintAssignmentEntity> {
    return TransactionHelper.run(this.dataSource, async (qr) => {
      const complaint = await qr.manager.findOne(ComplaintEntity, {
        where: { id: dto.complaintId },
      });
      if (!complaint) throw new NotFoundException("Complaint not found");

      const assignment = qr.manager.create(ComplaintAssignmentEntity, {
        complaintId: dto.complaintId,
        assigneeId: dto.assigneeId,
        assignedById: actorId,
        assignmentReason: dto.assignmentReason ?? null,
        slaDueDate: dto.slaDueDate ? new Date(dto.slaDueDate) : null,
        isSupervisorOverride: dto.isSupervisorOverride ?? false,
        status: AssignmentStatus.PENDING,
        createdBy: actorId,
      });
      const saved = await qr.manager.save(assignment);

      // Update complaint status to assigned
      const previousStatus = complaint.status;
      complaint.status = ComplaintStatus.ASSIGNED;
      complaint.slaDueDate = dto.slaDueDate
        ? new Date(dto.slaDueDate)
        : complaint.slaDueDate;
      complaint.updatedBy = actorId;
      await qr.manager.save(complaint);

      // Status history
      const history = qr.manager.create(ComplaintStatusHistoryEntity, {
        complaintId: dto.complaintId,
        previousStatus,
        newStatus: ComplaintStatus.ASSIGNED,
        changedById: actorId,
        reason: `Assigned to investigator`,
      });
      await qr.manager.save(history);

      await this.auditLogService.log({
        actorId,
        action: AuditAction.COMPLAINT_ASSIGNED,
        entityType: "complaint_assignment",
        entityId: saved.id,
        afterState: {
          complaintId: dto.complaintId,
          assigneeId: dto.assigneeId,
        },
      });

      return saved;
    });
  }

  async reassign(
    assignmentId: string,
    dto: ReassignDto,
    actorId: string,
  ): Promise<ComplaintAssignmentEntity> {
    return TransactionHelper.run(this.dataSource, async (qr) => {
      const oldAssignment = await qr.manager.findOne(
        ComplaintAssignmentEntity,
        {
          where: { id: assignmentId },
        },
      );
      if (!oldAssignment) throw new NotFoundException("Assignment not found");

      // Mark old as reassigned
      oldAssignment.status = AssignmentStatus.REASSIGNED;
      await qr.manager.save(oldAssignment);

      const newAssignment = qr.manager.create(ComplaintAssignmentEntity, {
        complaintId: oldAssignment.complaintId,
        assigneeId: dto.newAssigneeId,
        assignedById: actorId,
        assignmentReason: dto.reason ?? null,
        slaDueDate: dto.slaDueDate
          ? new Date(dto.slaDueDate)
          : oldAssignment.slaDueDate,
        previousAssignmentId: assignmentId,
        status: AssignmentStatus.PENDING,
        createdBy: actorId,
      });
      const saved = await qr.manager.save(newAssignment);

      await this.auditLogService.log({
        actorId,
        action: AuditAction.COMPLAINT_REASSIGNED,
        entityType: "complaint_assignment",
        entityId: saved.id,
        beforeState: { assigneeId: oldAssignment.assigneeId },
        afterState: { assigneeId: dto.newAssigneeId },
      });

      return saved;
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateAssignmentStatusDto,
    actorId: string,
  ): Promise<ComplaintAssignmentEntity> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
    });
    if (!assignment) throw new NotFoundException("Assignment not found");

    assignment.status = dto.status;
    if (dto.status === AssignmentStatus.COMPLETED) {
      assignment.completedAt = new Date();
    }

    return this.assignmentRepository.save(assignment);
  }

  async findAll(
    filters: ListAssignmentsDto,
  ): Promise<PaginatedResult<ComplaintAssignmentEntity>> {
    const qb = this.assignmentRepository.createQueryBuilder("a");

    if (filters.complaintId)
      qb.andWhere("a.complaintId = :cid", { cid: filters.complaintId });
    if (filters.assigneeId)
      qb.andWhere("a.assigneeId = :aid", { aid: filters.assigneeId });
    if (filters.status)
      qb.andWhere("a.status = :status", { status: filters.status });

    qb.orderBy("a.createdAt", "DESC");

    const [items, total] = await qb
      .skip(filters.skip)
      .take(filters.limit)
      .getManyAndCount();
    return new PaginatedResult(items, total, filters.page, filters.limit);
  }

  async findByComplaint(
    complaintId: string,
  ): Promise<ComplaintAssignmentEntity[]> {
    return this.assignmentRepository.find({
      where: { complaintId },
      order: { createdAt: "DESC" },
    });
  }
}
