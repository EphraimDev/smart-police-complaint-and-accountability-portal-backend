import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, EntityManager } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { createHash } from "crypto";
import * as path from "path";
import * as mime from "mime-types";
import {
  ComplaintEntity,
  ComplaintNoteEntity,
} from "./entities/complaint.entity";
import { ComplaintStatusHistoryEntity } from "@modules/complaint-status-history/entities/complaint-status-history.entity";
import { ComplaintOfficerEntity } from "@modules/officers/entities/officer.entity";
import {
  EvidenceEntity,
  EvidenceChainOfCustodyEntity,
} from "@modules/evidence/entities/evidence.entity";
import {
  CreateComplaintDto,
  UpdateComplaintDto,
  UpdateComplaintStatusDto,
  ListComplaintsDto,
  AddComplaintNoteDto,
} from "./dto/complaint.dto";
import { AuditLogService } from "@modules/audit-logs/audit-log.service";
import {
  AuditAction,
  ComplaintStatus,
  EvidenceAccessLevel,
  EvidenceType,
  NotificationType,
} from "@common/enums";
import { QUEUE_NAMES } from "@common/constants";
import { EncryptionUtil } from "@shared/security";
import { TransactionHelper } from "@shared/database";
import { generateComplaintReference } from "@common/utils";
import { PaginatedResult } from "@shared/pagination/pagination.dto";
import { LocalStorageProvider } from "@integrations/storage";

type UploadedComplaintFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export interface ComplaintTrackingHistoryItem {
  previousStatus: ComplaintStatus | null;
  newStatus: ComplaintStatus;
  changedAt: Date;
  changedById: string;
  reasonCode: string | null;
  reason: string | null;
}

type ComplaintTrackingAttachment = EvidenceEntity & {
  fileUrl: string;
};

export type ComplaintTrackingResult = Omit<
  ComplaintEntity,
  | "complainantNameEncrypted"
  | "complainantEmailEncrypted"
  | "complainantPhoneEncrypted"
  | "complainantAddressEncrypted"
  | "trackingToken"
> & {
  isTrackingTokenAuthenticated: boolean;
  trackingToken?: string | null;
  complainantName?: string | null;
  complainantEmail?: string | null;
  complainantPhone?: string | null;
  complainantAddress?: string | null;
  attachments: ComplaintTrackingAttachment[];
  statusHistory: ComplaintTrackingHistoryItem[];
};

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
    private readonly storageProvider: LocalStorageProvider,
  ) {}

  async create(
    dto: CreateComplaintDto,
    userId: string | null,
    files: UploadedComplaintFile[] = [],
    ipAddress: string = "unknown",
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
    const uploadedPaths: string[] = [];

    try {
      return await TransactionHelper.run(this.dataSource, async (qr) => {
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
        const actorId = userId || saved.id;

        // Create initial status history
        const statusHistory = qr.manager.create(ComplaintStatusHistoryEntity, {
          complaintId: saved.id,
          previousStatus: null,
          newStatus: ComplaintStatus.SUBMITTED,
          changedById: actorId,
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

        if (files.length > 0) {
          await this.attachEvidenceFiles(
            qr.manager,
            saved,
            files,
            actorId,
            ipAddress,
            uploadedPaths,
          );
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
            uploadedFiles: files.length,
          },
        });

        // Enqueue AI analysis asynchronously
        await this.aiQueue.add("classify-complaint", {
          complaintId: saved.id,
          text: `${saved.title} ${saved.description}`,
        });

        // Enqueue notification
        await this.notificationQueue.add("complaint-submitted", {
          recipientId: userId ?? undefined,
          recipientEmail: undefined,
          type: NotificationType.IN_APP,
          subject: `Complaint ${saved.referenceNumber} submitted`,
          body: `Your complaint has been submitted successfully. Reference number: ${saved.referenceNumber}. Tracking token: ${saved.trackingToken}.`,
          referenceType: "complaint",
          referenceId: saved.id,
          metadata: {
            complaintId: saved.id,
            referenceNumber: saved.referenceNumber,
            trackingToken: saved.trackingToken,
          },
        });

        return saved;
      });
    } catch (error) {
      await this.cleanupUploadedFiles(uploadedPaths);

      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error("Failed to create complaint with uploads", error);
      throw error;
    }
  }

  async findById(id: string): Promise<ComplaintEntity> {
    const complaint = await this.complaintRepository.findOne({ where: { id } });
    if (!complaint) throw new NotFoundException("Complaint not found");
    return complaint;
  }

  async findByReference(reference: string): Promise<ComplaintTrackingResult> {
    const complaint = await this.complaintRepository.findOne({
      where: [{ referenceNumber: reference }, { trackingToken: reference }],
    });
    if (!complaint) throw new NotFoundException("Complaint not found");

    const statusHistory = await this.statusHistoryRepository.find({
      where: { complaintId: complaint.id },
      order: { createdAt: "ASC" },
    });
    const attachmentRecords = await this.dataSource
      .getRepository(EvidenceEntity)
      .find({
        where: { complaintId: complaint.id },
        order: { createdAt: "ASC" },
      });
    const attachments = await Promise.all(
      attachmentRecords.map(async (attachment) => ({
        ...attachment,
        fileUrl: await this.storageProvider.getSignedUrl(attachment.storagePath),
      })),
    );
    const isTrackingTokenAuthenticated = complaint.trackingToken === reference;
    const encryptionKey = isTrackingTokenAuthenticated
      ? this.configService.get<string>("auth.fieldEncryptionKey")!
      : null;
    const {
      complainantNameEncrypted,
      complainantEmailEncrypted,
      complainantPhoneEncrypted,
      complainantAddressEncrypted,
      trackingToken,
      ...complaintData
    } = complaint;
    return {
      ...complaintData,
      attachments,
      isTrackingTokenAuthenticated,
      ...(isTrackingTokenAuthenticated
        ? {
            trackingToken,
            complainantName: complainantNameEncrypted
              ? EncryptionUtil.decrypt(complainantNameEncrypted, encryptionKey!)
              : null,
            complainantEmail: complainantEmailEncrypted
              ? EncryptionUtil.decrypt(
                  complainantEmailEncrypted,
                  encryptionKey!,
                )
              : null,
            complainantPhone: complainantPhoneEncrypted
              ? EncryptionUtil.decrypt(
                  complainantPhoneEncrypted,
                  encryptionKey!,
                )
              : null,
            complainantAddress: complainantAddressEncrypted
              ? EncryptionUtil.decrypt(
                  complainantAddressEncrypted,
                  encryptionKey!,
                )
              : null,
          }
        : {}),
      statusHistory: statusHistory.map((entry) => ({
        previousStatus: entry.previousStatus,
        newStatus: entry.newStatus,
        changedAt: entry.createdAt,
        changedById: entry.changedById,
        reasonCode: entry.reasonCode,
        reason: entry.reason,
      })),
    };
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
        recipientId: complaint.citizenUserId ?? undefined,
        type: NotificationType.IN_APP,
        subject: `Complaint ${complaint.referenceNumber} status updated`,
        body: `Your complaint status changed from ${previousStatus} to ${dto.status}.`,
        referenceType: "complaint",
        referenceId: id,
        metadata: {
          complaintId: id,
          referenceNumber: complaint.referenceNumber,
          previousStatus,
          newStatus: dto.status,
        },
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

  private async attachEvidenceFiles(
    manager: EntityManager,
    complaint: ComplaintEntity,
    files: UploadedComplaintFile[],
    actorId: string,
    ipAddress: string,
    uploadedPaths: string[],
  ): Promise<void> {
    for (const file of files) {
      this.validateUploadedFile(file);

      const extension =
        path.extname(file.originalname) ||
        `.${mime.extension(file.mimetype) || "bin"}`;
      const safeBaseName = this.sanitizeFileBaseName(
        path.basename(file.originalname, path.extname(file.originalname)),
      );
      const generatedFileName = `${uuidv4()}-${safeBaseName}${extension}`;
      const storagePath = path.posix.join("complaints", complaint.id, generatedFileName);
      const fileHash = createHash("sha256").update(file.buffer).digest("hex");

      await this.storageProvider.upload(storagePath, file.buffer, file.mimetype);
      uploadedPaths.push(storagePath);

      const evidence = manager.create(EvidenceEntity, {
        complaintId: complaint.id,
        fileName: generatedFileName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        storagePath,
        storageProvider: this.configService.get<string>(
          "STORAGE_PROVIDER",
          "local",
        ),
        fileHash,
        hashAlgorithm: "sha256",
        evidenceType: this.inferEvidenceType(file.mimetype),
        accessLevel: EvidenceAccessLevel.RESTRICTED,
        description: null,
        createdBy: actorId,
      });
      const savedEvidence = await manager.save(evidence);

      const custodyEntry = manager.create(EvidenceChainOfCustodyEntity, {
        evidenceId: savedEvidence.id,
        actorId,
        action: "uploaded",
        ipAddress,
        notes: "Uploaded during complaint submission",
      });
      await manager.save(custodyEntry);

      await this.auditLogService.log({
        actorId,
        action: AuditAction.EVIDENCE_UPLOADED,
        entityType: "evidence",
        entityId: savedEvidence.id,
        afterState: {
          complaintId: complaint.id,
          fileName: savedEvidence.originalName,
          evidenceType: savedEvidence.evidenceType,
          fileHash: savedEvidence.fileHash,
        },
        ipAddress,
      });
    }
  }

  private validateUploadedFile(file: UploadedComplaintFile): void {
    if (!file?.buffer) {
      throw new BadRequestException("Uploaded file payload is invalid");
    }

    const allowedTypes = this.configService.get<string[]>(
      "app.allowedFileTypes",
      [],
    );
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }

    const maxSize = this.configService.get<number>("app.maxFileSize", 10485760);
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum of ${maxSize} bytes`,
      );
    }

    const expectedExtension = mime.extension(file.mimetype);
    const actualExtension = file.originalname.split(".").pop()?.toLowerCase();
    if (
      expectedExtension &&
      actualExtension &&
      expectedExtension !== actualExtension
    ) {
      throw new BadRequestException("File extension does not match MIME type");
    }
  }

  private inferEvidenceType(mimeType: string): EvidenceType {
    if (mimeType.startsWith("image/")) {
      return EvidenceType.IMAGE;
    }

    if (mimeType.startsWith("video/")) {
      return EvidenceType.VIDEO;
    }

    if (mimeType.startsWith("audio/")) {
      return EvidenceType.AUDIO;
    }

    if (
      mimeType === "application/pdf" ||
      mimeType.startsWith("text/") ||
      mimeType.includes("document") ||
      mimeType.includes("sheet") ||
      mimeType.includes("presentation")
    ) {
      return EvidenceType.DOCUMENT;
    }

    return EvidenceType.OTHER;
  }

  private sanitizeFileBaseName(originalName: string): string {
    return originalName
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "file";
  }

  private async cleanupUploadedFiles(uploadedPaths: string[]): Promise<void> {
    for (const uploadedPath of uploadedPaths) {
      try {
        await this.storageProvider.delete(uploadedPath);
      } catch (cleanupError) {
        this.logger.warn(
          `Failed to clean up uploaded file at ${uploadedPath}: ${String(cleanupError)}`,
        );
      }
    }
  }
}
