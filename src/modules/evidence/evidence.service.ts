import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { v4 as uuidv4 } from "uuid";
import {
  EvidenceEntity,
  EvidenceChainOfCustodyEntity,
} from "./entities/evidence.entity";
import { CreateEvidenceDto, ListEvidenceDto } from "./dto/evidence.dto";
import { AuditLogService } from "@modules/audit-logs/audit-log.service";
import { AuditAction, EvidenceAccessLevel } from "@common/enums";
import { TransactionHelper } from "@shared/database";
import { PaginatedResult } from "@shared/pagination/pagination.dto";
import * as mime from "mime-types";

@Injectable()
export class EvidenceService {
  private readonly logger = new Logger(EvidenceService.name);

  constructor(
    @InjectRepository(EvidenceEntity)
    private readonly evidenceRepository: Repository<EvidenceEntity>,
    @InjectRepository(EvidenceChainOfCustodyEntity)
    private readonly custodyRepository: Repository<EvidenceChainOfCustodyEntity>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(
    dto: CreateEvidenceDto,
    actorId: string,
    ipAddress: string,
  ): Promise<EvidenceEntity> {
    // Validate MIME type
    const allowedTypes = this.configService.get<string[]>(
      "app.allowedFileTypes",
      [],
    );
    if (allowedTypes.length > 0 && !allowedTypes.includes(dto.mimeType)) {
      throw new BadRequestException(`File type ${dto.mimeType} is not allowed`);
    }

    // Validate file size
    const maxSize = this.configService.get<number>("app.maxFileSize", 10485760);
    if (dto.fileSize > maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum of ${maxSize} bytes`,
      );
    }

    // Validate extension matches MIME
    const expectedExtension = mime.extension(dto.mimeType);
    const actualExtension = dto.originalName.split(".").pop()?.toLowerCase();
    if (
      expectedExtension &&
      actualExtension &&
      expectedExtension !== actualExtension
    ) {
      throw new BadRequestException("File extension does not match MIME type");
    }

    return TransactionHelper.run(this.dataSource, async (qr) => {
      const fileName = `${uuidv4()}.${actualExtension || "bin"}`;

      const evidence = qr.manager.create(EvidenceEntity, {
        complaintId: dto.complaintId,
        fileName,
        originalName: dto.originalName,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize,
        storagePath: dto.storagePath,
        storageProvider: this.configService.get<string>(
          "STORAGE_PROVIDER",
          "local",
        ),
        fileHash: dto.fileHash,
        hashAlgorithm: "sha256",
        evidenceType: dto.evidenceType,
        accessLevel: dto.accessLevel ?? EvidenceAccessLevel.RESTRICTED,
        description: dto.description ?? null,
        createdBy: actorId,
      });
      const saved = await qr.manager.save(evidence);

      // Chain of custody entry
      const custody = qr.manager.create(EvidenceChainOfCustodyEntity, {
        evidenceId: saved.id,
        actorId,
        action: "uploaded",
        ipAddress,
        notes: "Initial upload",
      });
      await qr.manager.save(custody);

      await this.auditLogService.log({
        actorId,
        action: AuditAction.EVIDENCE_UPLOADED,
        entityType: "evidence",
        entityId: saved.id,
        afterState: {
          complaintId: saved.complaintId,
          fileName: saved.originalName,
          evidenceType: saved.evidenceType,
          fileHash: saved.fileHash,
        },
        ipAddress,
      });

      return saved;
    });
  }

  async findById(id: string): Promise<EvidenceEntity> {
    const evidence = await this.evidenceRepository.findOne({ where: { id } });
    if (!evidence) throw new NotFoundException("Evidence not found");
    return evidence;
  }

  async findAll(
    filters: ListEvidenceDto,
  ): Promise<PaginatedResult<EvidenceEntity>> {
    const qb = this.evidenceRepository.createQueryBuilder("e");

    if (filters.complaintId)
      qb.andWhere("e.complaintId = :cid", { cid: filters.complaintId });
    if (filters.evidenceType)
      qb.andWhere("e.evidenceType = :type", { type: filters.evidenceType });

    qb.orderBy("e.createdAt", "DESC");

    const [items, total] = await qb
      .skip(filters.skip)
      .take(filters.limit)
      .getManyAndCount();
    return new PaginatedResult(items, total, filters.page, filters.limit);
  }

  async getChainOfCustody(
    evidenceId: string,
  ): Promise<EvidenceChainOfCustodyEntity[]> {
    return this.custodyRepository.find({
      where: { evidenceId },
      order: { createdAt: "ASC" },
    });
  }

  async recordAccess(
    evidenceId: string,
    actorId: string,
    ipAddress: string,
  ): Promise<void> {
    const custody = this.custodyRepository.create({
      evidenceId,
      actorId,
      action: "accessed",
      ipAddress,
    });
    await this.custodyRepository.save(custody);

    await this.auditLogService.log({
      actorId,
      action: AuditAction.EVIDENCE_ACCESSED,
      entityType: "evidence",
      entityId: evidenceId,
      ipAddress,
    });
  }

  async verifyIntegrity(id: string, providedHash: string): Promise<boolean> {
    const evidence = await this.findById(id);
    return evidence.fileHash === providedHash;
  }
}
