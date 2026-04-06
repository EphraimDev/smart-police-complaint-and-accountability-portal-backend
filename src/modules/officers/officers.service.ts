import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { OfficerEntity } from "./entities/officer.entity";
import {
  CreateOfficerDto,
  UpdateOfficerDto,
  ListOfficersDto,
  BulkUploadOfficersResponseDto,
} from "./dto/officer.dto";
import { AuditLogService } from "@modules/audit-logs/audit-log.service";
import { AuditAction } from "@common/enums";
import { PaginatedResult } from "@shared/pagination/pagination.dto";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dayjs = require("dayjs") as (date?: string) => {
  isValid(): boolean;
  format(template: string): string;
};

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
    qb.leftJoinAndSelect("o.station", "station");
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

  async bulkUpload(
    file: { buffer: Buffer; originalname: string } | undefined,
    stationId: string,
    actorId: string,
  ): Promise<BulkUploadOfficersResponseDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException("CSV file is required");
    }

    const rows = this.parseCsv(file.buffer.toString("utf-8"));
    if (rows.length === 0) {
      throw new BadRequestException("CSV file is empty");
    }

    const headers = rows[0].map((header) => header.trim());
    const requiredHeaders = ["badgeNumber", "firstName", "lastName", "rank"];
    const missingHeaders = requiredHeaders.filter(
      (header) => !headers.includes(header),
    );

    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `Missing required CSV headers: ${missingHeaders.join(", ")}`,
      );
    }

    const createdOfficers: OfficerEntity[] = [];
    const errors: Array<{
      row: number;
      badgeNumber: string | null;
      error: string;
    }> = [];

    for (let index = 1; index < rows.length; index += 1) {
      const values = rows[index];
      if (values.every((value) => value.trim() === "")) {
        continue;
      }

      const rowData = Object.fromEntries(
        headers.map((header, columnIndex) => [
          header,
          values[columnIndex]?.trim() ?? "",
        ]),
      );

      const dto = plainToInstance(CreateOfficerDto, {
        badgeNumber: rowData.badgeNumber,
        serviceNumber: rowData.serviceNumber || undefined,
        firstName: rowData.firstName,
        lastName: rowData.lastName,
        rank: rowData.rank,
        unit: rowData.unit || undefined,
        stationId,
        joinedDate: dayjs(rowData.joinedDate).isValid()
          ? dayjs(rowData.joinedDate).format("YYYY-MM-DD")
          : undefined,
      });

      const validationErrors = validateSync(dto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });

      if (validationErrors.length > 0) {
        errors.push({
          row: index + 1,
          badgeNumber: rowData.badgeNumber || null,
          error: validationErrors
            .flatMap((error) => Object.values(error.constraints || {}))
            .join(", "),
        });
        continue;
      }

      try {
        createdOfficers.push(await this.create(dto, actorId));
      } catch (error) {
        errors.push({
          row: index + 1,
          badgeNumber: rowData.badgeNumber || null,
          error:
            error instanceof Error ? error.message : "Failed to create officer",
        });
      }
    }

    return {
      totalRows: rows.length - 1,
      successCount: createdOfficers.length,
      failureCount: errors.length,
      createdOfficers,
      errors,
    };
  }

  private parseCsv(content: string): string[][] {
    const normalized = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentValue = "";
    let inQuotes = false;

    for (let index = 0; index < normalized.length; index += 1) {
      const char = normalized[index];
      const nextChar = normalized[index + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === "," && !inQuotes) {
        currentRow.push(currentValue);
        currentValue = "";
        continue;
      }

      if (char === "\n" && !inQuotes) {
        currentRow.push(currentValue);
        rows.push(currentRow);
        currentRow = [];
        currentValue = "";
        continue;
      }

      currentValue += char;
    }

    if (currentValue.length > 0 || currentRow.length > 0) {
      currentRow.push(currentValue);
      rows.push(currentRow);
    }

    return rows;
  }
}
