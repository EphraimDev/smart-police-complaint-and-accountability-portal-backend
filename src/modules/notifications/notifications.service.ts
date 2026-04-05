import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotificationEntity } from "./entities/notification.entity";
import { NotificationType, NotificationStatus } from "@common/enums";
import { PaginatedResult } from "@shared/pagination/pagination.dto";

export interface SendNotificationInput {
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  type: NotificationType;
  subject: string;
  body: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
  ) {}

  async create(input: SendNotificationInput): Promise<NotificationEntity> {
    const notification = this.notificationRepository.create({
      recipientId: input.recipientId ?? null,
      recipientEmail: input.recipientEmail ?? null,
      recipientPhone: input.recipientPhone ?? null,
      type: input.type,
      subject: input.subject,
      body: input.body,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      metadata: input.metadata ?? null,
      status: NotificationStatus.PENDING,
    });
    return this.notificationRepository.save(notification);
  }

  async markSent(id: string): Promise<void> {
    await this.notificationRepository.update(id, {
      status: NotificationStatus.SENT,
      sentAt: new Date(),
    });
  }

  async markFailed(id: string, reason: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });
    if (!notification) return;

    const retryCount = notification.retryCount + 1;
    const status =
      retryCount >= notification.maxRetries
        ? NotificationStatus.FAILED
        : NotificationStatus.RETRYING;

    await this.notificationRepository.update(id, {
      status,
      failedAt: new Date(),
      failureReason: reason,
      retryCount,
    });
  }

  async findByRecipient(
    recipientId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<NotificationEntity>> {
    const [items, total] = await this.notificationRepository.findAndCount({
      where: { recipientId },
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return new PaginatedResult(items, total, page, limit);
  }

  async getDeadLetterQueue(
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<NotificationEntity>> {
    const [items, total] = await this.notificationRepository.findAndCount({
      where: { status: NotificationStatus.FAILED },
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return new PaginatedResult(items, total, page, limit);
  }
}
