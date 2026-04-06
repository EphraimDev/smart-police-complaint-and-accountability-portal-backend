import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import * as argon2 from "argon2";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { UserEntity, RoleEntity } from "./entities/user.entity";
import {
  CreateUserDto,
  UpdateUserDto,
  ListUsersDto,
  UserResponseDto,
  AssignRolesDto,
  BulkUploadUsersResponseDto,
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

    // const passwordHash = await argon2.hash(dto.password);

    const encryptionKey = this.configService.get<string>(
      "auth.fieldEncryptionKey",
    )!;

    const user = this.userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      // passwordHash,
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

  async bulkUpload(
    file: { buffer: Buffer; originalname: string } | undefined,
    actorId: string,
  ): Promise<BulkUploadUsersResponseDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException("CSV file is required");
    }

    const rows = this.parseCsv(file.buffer.toString("utf-8"));
    if (rows.length === 0) {
      throw new BadRequestException("CSV file is empty");
    }

    const headers = rows[0].map((header) => header.trim());
    const requiredHeaders = ["firstName", "lastName", "email"];
    const missingHeaders = requiredHeaders.filter(
      (header) => !headers.includes(header),
    );

    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `Missing required CSV headers: ${missingHeaders.join(", ")}`,
      );
    }

    const createdUsers: UserResponseDto[] = [];
    const errors: Array<{ row: number; email: string | null; error: string }> =
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
      const roles = await this.roleRepository.find({});
      const dto = plainToInstance(CreateUserDto, {
        firstName: rowData.firstName,
        lastName: rowData.lastName,
        email: rowData.email,
        password: null,
        phone: rowData.phone || undefined,
        roleIds: await this.resolveBulkUploadRoleIds(roles, rowData),
      });

      const validationErrors = validateSync(dto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });

      if (validationErrors.length > 0) {
        errors.push({
          row: index + 1,
          email: rowData.email || null,
          error: validationErrors
            .flatMap((error) => Object.values(error.constraints || {}))
            .join(", "),
        });
        continue;
      }

      try {
        createdUsers.push(await this.create(dto, actorId));
      } catch (error) {
        errors.push({
          row: index + 1,
          email: rowData.email || null,
          error:
            error instanceof Error ? error.message : "Failed to create user",
        });
      }
    }

    return {
      totalRows: rows.length - 1,
      successCount: createdUsers.length,
      failureCount: errors.length,
      createdUsers,
      errors,
    };
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

  private async resolveBulkUploadRoleIds(
    roles: RoleEntity[],
    rowData: Record<string, string>,
  ): Promise<string[] | undefined> {
    const roleNames = rowData.roles?.split("|");

    if (!roleNames || roleNames.length === 0) {
      return undefined;
    }

    const normalizedRoleNames = Array.from(
      new Set(roleNames.map((name) => name.toUpperCase())),
    );

    const rolesByName = new Map(roles.map((role) => [role.name, role.id]));
    const missingRoleNames = normalizedRoleNames.filter(
      (name) => !rolesByName.has(name),
    );

    if (missingRoleNames.length > 0) {
      throw new BadRequestException(
        `Unknown role(s): ${missingRoleNames.join(", ")}`,
      );
    }

    return normalizedRoleNames.map((name) => rolesByName.get(name)!);
  }
}
