import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OfficerEntity } from "./entities/officer.entity";
import {
  CreateOfficerDto,
  UpdateOfficerDto,
  ListOfficersDto,
} from "./dto/officer.dto";
import { AuditLogService } from "@modules/audit-logs/audit-log.service";
import { AuditAction } from "@common/enums";
import { PaginatedResult } from "@shared/pagination/pagination.dto";

@Injectable()
export class OfficersService {
  constructor(
    @InjectRepository(OfficerEntity)
    private readonly officerRepository: Repository<OfficerEntity>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateOfficerDto, actorId: string): Promise<OfficerEntity> {
    const existing = await this.officerRepository.findOne({
      where: { badgeNumber: dto.badgeNumber },
    });
    if (existing)
      throw new ConflictException(
        "Officer with this badge number already exists",
      );

    const officer = this.officerRepository.create({
      ...dto,
      joinedDate: dto.joinedDate ? new Date(dto.joinedDate) : null,
      createdBy: actorId,
    });
    const saved = await this.officerRepository.save(officer);

    await this.auditLogService.log({
      actorId,
      action: AuditAction.OFFICER_CREATED,
      entityType: "officer",
      entityId: saved.id,
      afterState: { badgeNumber: saved.badgeNumber, rank: saved.rank },
    });

    return saved;
  }

  async findById(id: string): Promise<OfficerEntity> {
    const officer = await this.officerRepository.findOne({ where: { id } });
    if (!officer) throw new NotFoundException("Officer not found");
    return officer;
  }

  async findAll(
    filters: ListOfficersDto,
  ): Promise<PaginatedResult<OfficerEntity>> {
    const qb = this.officerRepository.createQueryBuilder("o");

    if (filters.search) {
      qb.andWhere(
        "(o.firstName ILIKE :search OR o.lastName ILIKE :search OR o.badgeNumber ILIKE :search)",
        { search: `%${filters.search}%` },
      );
    }
    if (filters.stationId)
      qb.andWhere("o.stationId = :sid", { sid: filters.stationId });
    if (filters.rank) qb.andWhere("o.rank = :rank", { rank: filters.rank });

    qb.orderBy("o.createdAt", filters.sortOrder || "DESC");

    const [items, total] = await qb
      .skip(filters.skip)
      .take(filters.limit)
      .getManyAndCount();
    return new PaginatedResult(items, total, filters.page, filters.limit);
  }

  async update(
    id: string,
    dto: UpdateOfficerDto,
    actorId: string,
  ): Promise<OfficerEntity> {
    const officer = await this.findById(id);

    if (dto.rank) officer.rank = dto.rank;
    if (dto.unit !== undefined) officer.unit = dto.unit ?? null;
    if (dto.stationId !== undefined) officer.stationId = dto.stationId ?? null;
    officer.updatedBy = actorId;

    const saved = await this.officerRepository.save(officer);

    await this.auditLogService.log({
      actorId,
      action: AuditAction.OFFICER_UPDATED,
      entityType: "officer",
      entityId: id,
    });

    return saved;
  }
}
