import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { TypeOrmModule } from "@nestjs/typeorm";
import { QUEUE_NAMES } from "@common/constants";
import { NotificationProcessor } from "./processors/notification.processor";
import { AiAnalysisProcessor } from "./processors/ai-analysis.processor";
import { OverdueCheckProcessor } from "./processors/overdue-check.processor";
import { NotificationsModule } from "@modules/notifications/notifications.module";
import { AiAnalysisResultEntity } from "@modules/ai/entities/ai-analysis-result.entity";
import { ComplaintEntity } from "@modules/complaints/entities/complaint.entity";
import { AI_PROVIDER } from "@integrations/ai/ai-provider.interface";
import { MockAiProvider } from "@integrations/ai/mock-ai.provider";

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.NOTIFICATIONS },
      { name: QUEUE_NAMES.AI_ANALYSIS },
      { name: QUEUE_NAMES.OVERDUE_CHECK },
      { name: QUEUE_NAMES.EVIDENCE_PROCESSING },
      { name: QUEUE_NAMES.REPORT_GENERATION },
    ),
    TypeOrmModule.forFeature([AiAnalysisResultEntity, ComplaintEntity]),
    NotificationsModule,
  ],
  providers: [
    NotificationProcessor,
    AiAnalysisProcessor,
    OverdueCheckProcessor,
    {
      provide: AI_PROVIDER,
      useClass: MockAiProvider,
    },
  ],
  exports: [BullModule],
})
export class JobsModule {}
