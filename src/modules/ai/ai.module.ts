import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AiService } from "./ai.service";
import { AiController } from "./ai.controller";
import { AiAnalysisResultEntity } from "./entities/ai-analysis-result.entity";
import { ComplaintEntity } from "@modules/complaints/entities/complaint.entity";
import { AI_PROVIDER } from "@integrations/ai/ai-provider.interface";
import { MockAiProvider } from "@integrations/ai/mock-ai.provider";
import { AuditLogModule } from "@modules/audit-logs/audit-log.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([AiAnalysisResultEntity, ComplaintEntity]),
    AuditLogModule,
  ],
  controllers: [AiController],
  providers: [
    AiService,
    {
      provide: AI_PROVIDER,
      useClass: MockAiProvider,
    },
  ],
  exports: [AiService],
})
export class AiModule {}
