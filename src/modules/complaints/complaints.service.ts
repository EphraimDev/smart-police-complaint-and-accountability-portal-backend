import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import {
  ComplaintEntity,
  ComplaintNoteEntity,
} from "./entities/complaint.entity";
import { ComplaintStatusHistoryEntity } from "@modules/complaint-status-history/entities/complaint-status-history.entity";
import { ComplaintOfficerEntity } from "@modules/officers/entities/officer.entity";
import {
  CreateComplaintDto,
  UpdateComplaintDto,
  UpdateComplaintStatusDto,
  ListComplaintsDto,
  AddComplaintNoteDto,
} from "./dto/complaint.dto";
import { AuditLogService } from "@modules/audit-logs/audit-log.service";
import { AuditAction, ComplaintStatus } from "@common/enums";
import { QUEUE_NAMES } from "@common/constants";
import { EncryptionUtil } from "@shared/security";
import { TransactionHelper } from "@shared/database";
import { generateComplaintReference } from "@common/utils";
import { PaginatedResult } from "@shared/pagination/pagination.dto";

@Injectable()
export class ComplaintsService {
  private readonly logger = new Logger(ComplaintsService.name);

  constructor(
    @InjectRepository(ComplaintEntity)
    private readonly complaintRepository: Repository<ComplaintEntity>,
    @InjectRepository(ComplaintNoteEntity)
    private readonly noteRepository: Repository<ComplaintNoteEntity>,
    @InjectRepository(ComplaintOfficerEntity)
    private readonly complaintOfficerRepository: Repository<ComplaintOfficerEntity>,
    @InjectRepository(ComplaintStatusHistoryEntity)
    private readonly statusHistoryRepository: Repository<ComplaintStatusHistoryEntity>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
    @InjectQueue(QUEUE_NAMES.AI_ANALYSIS)
    private readonly aiQueue: Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationQueue: Queue,
  ) {}

  async create(
    dto: CreateComplaintDto,
    userId: string | null,
  ): Promise<ComplaintEntity> {
    // Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.complaintRepository.findOne({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return existing;
    }

    const encryptionKey = this.configService.get<string>(
      "auth.fieldEncryptionKey",
    )!;

    return TransactionHelper.run(this.dataSource, async (qr) => {
      const referenceNumber = generateComplaintReference();
      const trackingToken = uuidv4();

      const complaint = qr.manager.create(ComplaintEntity, {
        referenceNumber,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        severity: dto.severity,
        source: dto.source,
        channel: dto.channel,
        isAnonymous: dto.isAnonymous ?? false,
        citizenUserId: userId,
        complainantNameEncrypted: dto.complainantName
          ? EncryptionUtil.encrypt(dto.complainantName, encryptionKey)
          : null,
        complainantEmailEncrypted: dto.complainantEmail
          ? EncryptionUtil.encrypt(dto.complainantEmail, encryptionKey)
          : null,
        complainantPhoneEncrypted: dto.complainantPhone
          ? EncryptionUtil.encrypt(dto.complainantPhone, encryptionKey)
          : null,
        complainantAddressEncrypted: dto.complainantAddress
          ? EncryptionUtil.encrypt(dto.complainantAddress, encryptionKey)
          : null,
        incidentDate: dto.incidentDate ? new Date(dto.incidentDate) : null,
        incidentLocation: dto.incidentLocation ?? null,
        stationId: dto.stationId ?? null,
        trackingToken,
        status: ComplaintStatus.SUBMITTED,
        idempotencyKey: dto.idempotencyKey ?? null,
        createdBy: userId,
      });

      const saved = await qr.manager.save(complaint);

      // Create initial status history
      const statusHistory = qr.manager.create(ComplaintStatusHistoryEntity, {
        complaintId: saved.id,
        previousStatus: null,
        newStatus: ComplaintStatus.SUBMITTED,
        changedById: userId || saved.id,
        reason: "Complaint submitted",
      });
      await qr.manager.save(statusHistory);

      // Link officers if provided
      if (dto.officerIds?.length) {
        const officerLinks = dto.officerIds.map((officerId) =>
          qr.manager.create(ComplaintOfficerEntity, {
            complaintId: saved.id,
            officerId,
            role: "accused",
          }),
        );
        await qr.manager.save(officerLinks);
      }

      // Audit log
      await this.auditLogService.log({
        actorId: userId,
        action: AuditAction.COMPLAINT_CREATED,
        entityType: "complaint",
        entityId: saved.id,
        afterState: {
          referenceNumber,
          category: saved.category,
          severity: saved.severity,
          isAnonymous: saved.isAnonymous,
        },
      });

      // Enqueue AI analysis asynchronously
      await this.aiQueue.add("classify-complaint", {
        complaintId: saved.id,
        text: `${saved.title} ${saved.description}`,
      });

      // Enqueue notification
      await this.notificationQueue.add("complaint-submitted", {
        complaintId: saved.id,
        referenceNumber: saved.referenceNumber,
        trackingToken: saved.trackingToken,
        userId,
      });

      return saved;
    });
  }

  async findById(id: string): Promise<ComplaintEntity> {
    const complaint = await this.complaintRepository.findOne({ where: { id } });
    if (!complaint) throw new NotFoundException("Complaint not found");
    return complaint;
  }

  async findByReference(reference: string): Promise<ComplaintEntity> {
    const complaint = await this.complaintRepository.findOne({
      where: [{ referenceNumber: reference }, { trackingToken: reference }],
      select: [
        "id",
        "referenceNumber",
        "title",
        "status",
        "severity",
        "category",
        "createdAt",
        "updatedAt",
        "isOverdue",
      ],
    });
    if (!complaint) throw new NotFoundException("Complaint not found");
    return complaint;
  }

  async findAll(
    filters: ListComplaintsDto,
  ): Promise<PaginatedResult<ComplaintEntity>> {
    const qb = this.complaintRepository.createQueryBuilder("c");

    if (filters.status)
      qb.andWhere("c.status = :status", { status: filters.status });
    if (filters.category)
      qb.andWhere("c.category = :category", { category: filters.category });
    if (filters.severity)
      qb.andWhere("c.severity = :severity", { severity: filters.severity });
    if (filters.stationId)
      qb.andWhere("c.stationId = :stationId", { stationId: filters.stationId });
    if (filters.isOverdue !== undefined)
      qb.andWhere("c.isOverdue = :isOverdue", { isOverdue: filters.isOverdue });
    if (filters.dateFrom)
      qb.andWhere("c.createdAt >= :dateFrom", { dateFrom: filters.dateFrom });
    if (filters.dateTo)
      qb.andWhere("c.createdAt <= :dateTo", { dateTo: filters.dateTo });
    if (filters.search) {
      qb.andWhere(
        "(c.title ILIKE :search OR c.referenceNumber ILIKE :search)",
        {
          search: `%${filters.search}%`,
        },
      );
    }

    if (filters.officerId) {
      qb.innerJoin(
        "complaint_officers",
        "co",
        "co.complaint_id = c.id",
      ).andWhere("co.officer_id = :officerId", {
        officerId: filters.officerId,
      });
    }

    if (filters.assignedInvestigatorId) {
      qb.innerJoin("complaint_assignments", "ca", "ca.complaint_id = c.id")
        .andWhere("ca.assignee_id = :assigneeId", {
          assigneeId: filters.assignedInvestigatorId,
        })
        .andWhere("ca.status NOT IN (:...excludeStatuses)", {
          excludeStatuses: ["completed", "reassigned", "declined"],
        });
    }

    // Select only needed columns for list view
    qb.select([
      "c.id",
      "c.referenceNumber",
      "c.title",
      "c.status",
      "c.severity",
      "c.category",
      "c.source",
      "c.channel",
      "c.isAnonymous",
      "c.stationId",
      "c.createdAt",
      "c.updatedAt",
      "c.isOverdue",
      "c.slaDueDate",
    ]);

    const sortField = filters.sortBy || "createdAt";
    const allowedSorts = ["createdAt", "severity", "status", "category"];
    if (allowedSorts.includes(sortField)) {
      qb.orderBy(`c.${sortField}`, filters.sortOrder || "DESC");
    }

    const [items, total] = await qb
      .skip(filters.skip)
      .take(filters.limit)
      .getManyAndCount();

    return new PaginatedResult(items, total, filters.page, filters.limit);
  }

  async update(
    id: string,
    dto: UpdateComplaintDto,
    actorId: string,
  ): Promise<ComplaintEntity> {
    const complaint = await this.findById(id);

    const allowedForUpdate = [
      ComplaintStatus.SUBMITTED,
      ComplaintStatus.ACKNOWLEDGED,
      ComplaintStatus.UNDER_REVIEW,
    ];
    if (!allowedForUpdate.includes(complaint.status)) {
      throw new BadRequestException(
        "Complaint cannot be updated in its current status",
      );
    }

    const beforeState = {
      title: complaint.title,
      severity: complaint.severity,
      incidentLocation: complaint.incidentLocation,
    };

    if (dto.title) complaint.title = dto.title;
    if (dto.description) complaint.description = dto.description;
    if (dto.severity) complaint.severity = dto.severity;
    if (dto.incidentLocation !== undefined)
      complaint.incidentLocation = dto.incidentLocation;
    if (dto.stationId !== undefined) complaint.stationId = dto.stationId;
    complaint.updatedBy = actorId;

    const saved = await this.complaintRepository.save(complaint);

    await this.auditLogService.log({
      actorId,
      action: AuditAction.COMPLAINT_UPDATED,
      entityType: "complaint",
      entityId: id,
      beforeState,
      afterState: { title: saved.title, severity: saved.severity },
    });

    return saved;
  }

  async updateStatus(
    id: string,
    dto: UpdateComplaintStatusDto,
    actorId: string,
  ): Promise<ComplaintEntity> {
    return TransactionHelper.run(this.dataSource, async (qr) => {
      const complaint = await qr.manager.findOne(ComplaintEntity, {
        where: { id },
      });
      if (!complaint) throw new NotFoundException("Complaint not found");

      const previousStatus = complaint.status;
      complaint.status = dto.status;
      complaint.updatedBy = actorId;

      if (
        dto.status === ComplaintStatus.CLOSED ||
        dto.status === ComplaintStatus.RESOLVED
      ) {
        complaint.closedAt = new Date();
        if (dto.resolutionSummary)
          complaint.resolutionSummary = dto.resolutionSummary;
      }

      const saved = await qr.manager.save(complaint);

      // Create immutable status history
      const history = qr.manager.create(ComplaintStatusHistoryEntity, {
        complaintId: id,
        previousStatus,
        newStatus: dto.status,
        changedById: actorId,
        reasonCode: dto.reasonCode ?? null,
        reason: dto.reason ?? null,
      });
      await qr.manager.save(history);

      // Audit log
      await this.auditLogService.log({
        actorId,
        action: AuditAction.COMPLAINT_STATUS_CHANGED,
        entityType: "complaint",
        entityId: id,
        beforeState: { status: previousStatus },
        afterState: { status: dto.status },
      });

      // Notify about status change
      await this.notificationQueue.add("complaint-status-changed", {
        complaintId: id,
        previousStatus,
        newStatus: dto.status,
        citizenUserId: complaint.citizenUserId,
      });

      return saved;
    });
  }

  async addNote(
    complaintId: string,
    dto: AddComplaintNoteDto,
    actorId: string,
  ): Promise<ComplaintNoteEntity> {
    await this.findById(complaintId);

    const note = this.noteRepository.create({
      complaintId,
      content: dto.content,
      isInternal: dto.isInternal ?? true,
      noteType: dto.noteType ?? "general",
      createdBy: actorId,
    });

    return this.noteRepository.save(note);
  }

  async getNotes(
    complaintId: string,
    includeInternal: boolean,
  ): Promise<ComplaintNoteEntity[]> {
    const qb = this.noteRepository
      .createQueryBuilder("note")
      .where("note.complaintId = :complaintId", { complaintId })
      .orderBy("note.createdAt", "DESC");

    if (!includeInternal) {
      qb.andWhere("note.isInternal = false");
    }

    return qb.getMany();
  }

  async getTimeline(
    complaintId: string,
  ): Promise<ComplaintStatusHistoryEntity[]> {
    return this.statusHistoryRepository.find({
      where: { complaintId },
      order: { createdAt: "ASC" },
    });
  }
}
