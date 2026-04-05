import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";

// Configuration
import { validationSchema } from "@config/validation.schema";
import appConfig from "@config/app.config";
import authConfig from "@config/auth.config";
import databaseConfig from "@config/database.config";
import redisConfig from "@config/redis.config";
import queueConfig from "@config/queue.config";

// Common
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { PermissionsGuard } from "@common/guards/permissions.guard";
import { GlobalExceptionFilter } from "@common/filters/global-exception.filter";
import { ResponseTransformInterceptor } from "@common/interceptors/response-transform.interceptor";
import { RequestTimingInterceptor } from "@common/interceptors/request-timing.interceptor";
import { globalValidationPipe } from "@common/pipes/validation.pipe";

// Feature Modules
import { AuthModule } from "@modules/auth/auth.module";
import { UsersModule } from "@modules/users/users.module";
import { RolesModule } from "@modules/roles/roles.module";
import { PermissionsModule } from "@modules/permissions/permissions.module";
import { ComplaintsModule } from "@modules/complaints/complaints.module";
import { ComplaintAssignmentsModule } from "@modules/complaint-assignments/complaint-assignments.module";
import { ComplaintStatusHistoryModule } from "@modules/complaint-status-history/complaint-status-history.module";
import { EvidenceModule } from "@modules/evidence/evidence.module";
import { OfficersModule } from "@modules/officers/officers.module";
import { PoliceStationsModule } from "@modules/police-stations/police-stations.module";
import { OversightModule } from "@modules/oversight/oversight.module";
import { NotificationsModule } from "@modules/notifications/notifications.module";
import { AiModule } from "@modules/ai/ai.module";
import { ReportsModule } from "@modules/reports/reports.module";
import { AdminModule } from "@modules/admin/admin.module";
import { AuditLogModule } from "@modules/audit-logs/audit-log.module";
import { HealthModule } from "@modules/health/health.module";

// Jobs
import { JobsModule } from "@jobs/jobs.module";

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, databaseConfig, redisConfig, queueConfig],
      validationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get<string>("database.host"),
        port: configService.get<number>("database.port"),
        username: configService.get<string>("database.username"),
        password: configService.get<string>("database.password"),
        database: configService.get<string>("database.database"),
        autoLoadEntities: true,
        synchronize: false,
        migrations: [__dirname + "/migrations/*{.ts,.js}"],
        migrationsRun: false,
        logging: configService.get<string>("database.logging") === "true",
      }),
    }),

    // Queue (BullMQ + Redis)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>("redis.host"),
          port: configService.get<number>("redis.port"),
          password: configService.get<string>("redis.password") || undefined,
          db: configService.get<number>("redis.db"),
        },
        prefix: configService.get<string>("queue.prefix"),
        defaultJobOptions: {
          attempts: configService.get<number>(
            "queue.defaultJobOptions.attempts",
          ),
          backoff: {
            type:
              configService.get<string>(
                "queue.defaultJobOptions.backoff.type",
              ) || "exponential",
            delay: configService.get<number>(
              "queue.defaultJobOptions.backoff.delay",
            ),
          },
          removeOnComplete: configService.get<number>(
            "queue.defaultJobOptions.removeOnComplete",
          ),
          removeOnFail: configService.get<number>(
            "queue.defaultJobOptions.removeOnFail",
          ),
        },
      }),
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    ComplaintsModule,
    ComplaintAssignmentsModule,
    ComplaintStatusHistoryModule,
    EvidenceModule,
    OfficersModule,
    PoliceStationsModule,
    OversightModule,
    NotificationsModule,
    AiModule,
    ReportsModule,
    AdminModule,
    AuditLogModule,
    HealthModule,

    // Background jobs
    JobsModule,
  ],
  providers: [
    // Global guards (order matters: auth first, then permissions)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestTimingInterceptor,
    },
    // Global validation pipe
    {
      provide: APP_PIPE,
      useValue: globalValidationPipe,
    },
  ],
})
export class AppModule {}
