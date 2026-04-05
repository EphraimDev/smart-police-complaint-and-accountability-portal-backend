import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { QUEUE_NAMES } from "@common/constants";
import {
  NotificationsService,
  SendNotificationInput,
} from "@modules/notifications/notifications.service";

@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<SendNotificationInput>): Promise<void> {
    this.logger.log(
      `Processing notification job ${job.id}: type=${job.data.type}`,
    );

    try {
      const notification = await this.notificationsService.create(job.data);

      // In production, dispatch to email/SMS/push provider here based on type
      // For now, mark as sent immediately (mock behavior)
      await this.notificationsService.markSent(notification.id);

      this.logger.log(`Notification ${notification.id} sent successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to process notification job ${job.id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error; // Let BullMQ handle retries
    }
  }
}
