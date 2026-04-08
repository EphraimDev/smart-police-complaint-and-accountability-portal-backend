import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditLogEntity } from "./entities/audit-log.entity";
import { AuditAction } from "@common/enums";
import { sanitizeForLog } from "@common/utils";
import { UserEntity } from "@modules/users/entities/user.entity";

export interface CreateAuditLogInput {
  actorId?: string | null;
  actorEmail?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
  outcome?: string;
  failureReason?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  async log(input: CreateAuditLogInput): Promise<AuditLogEntity> {
    try {
      const sanitizedBefore = input.beforeState
        ? sanitizeForLog(input.beforeState)
        : null;
      const sanitizedAfter = input.afterState
        ? sanitizeForLog(input.afterState)
        : null;

      const entity = this.auditLogRepository.create({
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        beforeState: sanitizedBefore,
        afterState: sanitizedAfter,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        correlationId: input.correlationId ?? null,
        outcome: input.outcome ?? "success",
        failureReason: input.failureReason ?? null,
        metadata: input.metadata ?? null,
      });

      return await this.auditLogRepository.save(entity);
    } catch (error) {
      this.logger.error(
        `Failed to create audit log: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async findByEntity(
    entityType: string,
    entityId: string,
  ): Promise<AuditLogEntity[]> {
    return this.auditLogRepository.find({
      where: { entityType, entityId },
      order: { createdAt: "DESC" },
    });
  }

  async findByActor(
    actorId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<[AuditLogEntity[], number]> {
    return this.auditLogRepository.findAndCount({
      where: { actorId },
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findByAction(
    action: AuditAction,
    page: number = 1,
    limit: number = 20,
  ): Promise<[AuditLogEntity[], number]> {
    return this.auditLogRepository.findAndCount({
      where: { action },
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<[AuditLogEntity[], number]> {
    return this.auditLogRepository
      .createQueryBuilder("auditLog")
      .leftJoinAndMapOne(
        "auditLog.actor",
        UserEntity,
        "actor",
        "actor.id = auditLog.actorId",
      )
      .select([
        "auditLog",
        "actor.id",
        "actor.firstName",
        "actor.lastName",
        "actor.email",
      ])
      .orderBy("auditLog.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }
}
