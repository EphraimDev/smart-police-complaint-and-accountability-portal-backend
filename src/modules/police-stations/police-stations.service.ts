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
import { PoliceStationEntity } from "./entities/police-station.entity";
import {
  CreateStationDto,
  UpdateStationDto,
  ListStationsDto,
  BulkUploadStationsResponseDto,
} from "./dto/station.dto";
import { PaginatedResult } from "@shared/pagination/pagination.dto";

@Injectable()
export class PoliceStationsService {
  constructor(
    @InjectRepository(PoliceStationEntity)
    private readonly stationRepository: Repository<PoliceStationEntity>,
  ) {}

  async create(
    dto: CreateStationDto,
    actorId: string,
  ): Promise<PoliceStationEntity> {
    const existing = await this.stationRepository.findOne({
      where: { code: dto.code },
    });
    if (existing)
      throw new ConflictException("Station with this code already exists");

    const station = this.stationRepository.create({
      ...dto,
      createdBy: actorId,
    });
    return this.stationRepository.save(station);
  }

  async findById(id: string): Promise<PoliceStationEntity> {
    const station = await this.stationRepository.findOne({ where: { id } });
    if (!station) throw new NotFoundException("Station not found");
    return station;
  }

  async findAll(
    filters: ListStationsDto,
  ): Promise<PaginatedResult<PoliceStationEntity>> {
    const qb = this.stationRepository.createQueryBuilder("s");

    if (filters.search) {
      qb.andWhere("(s.name ILIKE :search OR s.code ILIKE :search)", {
        search: `%${filters.search}%`,
      });
    }
    if (filters.region)
      qb.andWhere("s.region = :region", { region: filters.region });

    qb.orderBy("s.name", "ASC");

    const [items, total] = await qb
      .skip(filters.skip)
      .take(filters.limit)
      .getManyAndCount();
    return new PaginatedResult(items, total, filters.page, filters.limit);
  }

  async update(
    id: string,
    dto: UpdateStationDto,
    actorId: string,
  ): Promise<PoliceStationEntity> {
    const station = await this.findById(id);

    if (dto.name) station.name = dto.name;
    if (dto.address !== undefined) station.address = dto.address ?? null;
    if (dto.region !== undefined) station.region = dto.region ?? null;
    if (dto.commandingOfficerId !== undefined)
      station.commandingOfficerId = dto.commandingOfficerId ?? null;
    station.updatedBy = actorId;

    return this.stationRepository.save(station);
  }

  async bulkUpload(
    file: { buffer: Buffer; originalname: string } | undefined,
    actorId: string,
  ): Promise<BulkUploadStationsResponseDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException("CSV file is required");
    }

    const rows = this.parseCsv(file.buffer.toString("utf-8"));
    if (rows.length === 0) {
      throw new BadRequestException("CSV file is empty");
    }

    const headers = rows[0].map((header) => header.trim());
    const requiredHeaders = ["code", "name"];
    const missingHeaders = requiredHeaders.filter(
      (header) => !headers.includes(header),
    );

    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `Missing required CSV headers: ${missingHeaders.join(", ")}`,
      );
    }

    const createdStations: PoliceStationEntity[] = [];
    const errors: Array<{ row: number; code: string | null; error: string }> =
      [];

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

      const dto = plainToInstance(CreateStationDto, {
        code: rowData.code,
        name: rowData.name,
        address: rowData.address || undefined,
        region: rowData.region || undefined,
        parentStationId: rowData.parentStationId || undefined,
        phone: rowData.phone || undefined,
        email: rowData.email || undefined,
      });

      const validationErrors = validateSync(dto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });

      if (validationErrors.length > 0) {
        errors.push({
          row: index + 1,
          code: rowData.code || null,
          error: validationErrors
            .flatMap((error) => Object.values(error.constraints || {}))
            .join(", "),
        });
        continue;
      }

      try {
        createdStations.push(await this.create(dto, actorId));
      } catch (error) {
        errors.push({
          row: index + 1,
          code: rowData.code || null,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create station",
        });
      }
    }

    return {
      totalRows: rows.length - 1,
      successCount: createdStations.length,
      failureCount: errors.length,
      createdStations,
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
