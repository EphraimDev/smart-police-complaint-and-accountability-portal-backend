import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  RoleEntity,
  PermissionEntity,
} from "@modules/users/entities/user.entity";
import { CreateRoleDto, UpdateRoleDto } from "./dto/role.dto";
import { AuditLogService } from "@modules/audit-logs/audit-log.service";
import { AuditAction } from "@common/enums";

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateRoleDto, actorId: string): Promise<RoleEntity> {
    const existing = await this.roleRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) throw new ConflictException("Role already exists");

    const role = this.roleRepository.create({
      name: dto.name,
      description: dto.description,
    });

    if (dto.permissionIds?.length) {
      role.permissions = await this.permissionRepository.findByIds(
        dto.permissionIds,
      );
    }

    const saved = await this.roleRepository.save(role);

    await this.auditLogService.log({
      actorId,
      action: AuditAction.ROLE_CREATED,
      entityType: "role",
      entityId: saved.id,
      afterState: { name: saved.name },
    });

    return saved;
  }

  async findAll(): Promise<RoleEntity[]> {
    return this.roleRepository.find({ relations: ["permissions"] });
  }

  async findById(id: string): Promise<RoleEntity> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ["permissions"],
    });
    if (!role) throw new NotFoundException("Role not found");
    return role;
  }

  async update(
    id: string,
    dto: UpdateRoleDto,
    actorId: string,
  ): Promise<RoleEntity> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ["permissions"],
    });
    if (!role) throw new NotFoundException("Role not found");
    if (role.isSystem)
      throw new BadRequestException("Cannot modify system roles");

    if (dto.description !== undefined) role.description = dto.description;

    if (dto.permissionIds) {
      role.permissions = await this.permissionRepository.findByIds(
        dto.permissionIds,
      );
    }

    const saved = await this.roleRepository.save(role);

    await this.auditLogService.log({
      actorId,
      action: AuditAction.ROLE_UPDATED,
      entityType: "role",
      entityId: id,
    });

    return saved;
  }

  async delete(id: string, actorId: string): Promise<void> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) throw new NotFoundException("Role not found");
    if (role.isSystem)
      throw new BadRequestException("Cannot delete system roles");

    await this.roleRepository.remove(role);

    await this.auditLogService.log({
      actorId,
      action: AuditAction.ROLE_UPDATED,
      entityType: "role",
      entityId: id,
      metadata: { action: "deleted", roleName: role.name },
    });
  }
}
