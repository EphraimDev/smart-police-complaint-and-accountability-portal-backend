import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PoliceStationEntity } from "./entities/police-station.entity";
import {
  CreateStationDto,
  UpdateStationDto,
  ListStationsDto,
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
}
