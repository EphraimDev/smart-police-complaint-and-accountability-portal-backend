import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as argon2 from "argon2";
import { UserEntity, RoleEntity } from "./entities/user.entity";
import {
  CreateUserDto,
  UpdateUserDto,
  ListUsersDto,
  UserResponseDto,
  AssignRolesDto,
} from "./dto/user.dto";
import { ConfigService } from "@nestjs/config";
import { EncryptionUtil } from "@shared/security";
import { AuditLogService } from "@modules/audit-logs/audit-log.service";
import { AuditAction } from "@common/enums";
import { PaginatedResult } from "@shared/pagination/pagination.dto";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateUserDto, actorId?: string): Promise<UserResponseDto> {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException("User with this email already exists");
    }

    const passwordHash = await argon2.hash(dto.password);

    const encryptionKey = this.configService.get<string>(
      "auth.fieldEncryptionKey",
    )!;

    const user = this.userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      passwordHash,
      phoneEncrypted: dto.phone
        ? EncryptionUtil.encrypt(dto.phone, encryptionKey)
        : null,
      createdBy: actorId ?? null,
    });

    const saved = await this.userRepository.save(user);

    if (dto.roleIds?.length) {
      const roles = await this.roleRepository.findByIds(dto.roleIds);
      saved.roles = roles;
      await this.userRepository.save(saved);
    }

    await this.auditLogService.log({
      actorId,
      action: AuditAction.USER_CREATED,
      entityType: "user",
      entityId: saved.id,
      afterState: {
        email: saved.email,
        firstName: saved.firstName,
        lastName: saved.lastName,
      },
    });

    return this.toResponseDto(saved);
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ["roles"],
    });
    if (!user) throw new NotFoundException("User not found");
    return this.toResponseDto(user);
  }

  async findAll(
    filters: ListUsersDto,
  ): Promise<PaginatedResult<UserResponseDto>> {
    const qb = this.userRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.roles", "roles")
      .where("user.deletedAt IS NULL");

    if (filters.search) {
      qb.andWhere(
        "(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)",
        { search: `%${filters.search}%` },
      );
    }

    if (filters.isActive !== undefined) {
      qb.andWhere("user.isActive = :isActive", { isActive: filters.isActive });
    }

    if (filters.role) {
      qb.andWhere("roles.name = :role", { role: filters.role });
    }

    const sortField = filters.sortBy || "createdAt";
    const allowedSorts = ["createdAt", "firstName", "lastName", "email"];
    if (allowedSorts.includes(sortField)) {
      qb.orderBy(`user.${sortField}`, filters.sortOrder || "DESC");
    }

    const [items, total] = await qb
      .skip(filters.skip)
      .take(filters.limit)
      .getManyAndCount();

    return new PaginatedResult(
      items.map((u) => this.toResponseDto(u)),
      total,
      filters.page,
      filters.limit,
    );
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actorId: string,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ["roles"],
    });
    if (!user) throw new NotFoundException("User not found");

    const beforeState = { firstName: user.firstName, lastName: user.lastName };

    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.lastName) user.lastName = dto.lastName;
    if (dto.phone !== undefined) {
      const encryptionKey = this.configService.get<string>(
        "auth.fieldEncryptionKey",
      )!;
      user.phoneEncrypted = dto.phone
        ? EncryptionUtil.encrypt(dto.phone, encryptionKey)
        : null;
    }
    user.updatedBy = actorId;

    const saved = await this.userRepository.save(user);

    await this.auditLogService.log({
      actorId,
      action: AuditAction.USER_UPDATED,
      entityType: "user",
      entityId: id,
      beforeState,
      afterState: { firstName: saved.firstName, lastName: saved.lastName },
    });

    return this.toResponseDto(saved);
  }

  async deactivate(id: string, actorId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException("User not found");

    await this.userRepository.update(id, {
      isActive: false,
      updatedBy: actorId,
    });

    await this.auditLogService.log({
      actorId,
      action: AuditAction.USER_DEACTIVATED,
      entityType: "user",
      entityId: id,
    });
  }

  async activate(id: string, actorId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException("User not found");

    await this.userRepository.update(id, {
      isActive: true,
      updatedBy: actorId,
    });

    await this.auditLogService.log({
      actorId,
      action: AuditAction.USER_ACTIVATED,
      entityType: "user",
      entityId: id,
    });
  }

  async assignRoles(
    userId: string,
    dto: AssignRolesDto,
    actorId: string,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["roles"],
    });
    if (!user) throw new NotFoundException("User not found");

    const roles = await this.roleRepository.findByIds(dto.roleIds);
    const beforeRoles = user.roles.map((r) => r.name);
    user.roles = roles;
    user.updatedBy = actorId;
    const saved = await this.userRepository.save(user);

    await this.auditLogService.log({
      actorId,
      action: AuditAction.ROLE_ASSIGNED,
      entityType: "user",
      entityId: userId,
      beforeState: { roles: beforeRoles },
      afterState: { roles: roles.map((r) => r.name) },
    });

    return this.toResponseDto(saved);
  }

  private toResponseDto(user: UserEntity): UserResponseDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isActive: user.isActive,
      roles: user.roles?.map((r) => r.name) || [],
      createdAt: user.createdAt,
    };
  }
}
