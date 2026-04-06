import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { WinstonLogger } from "@common/utils/winston.logger";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: WinstonLogger,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new WinstonLogger(
          configService.get<string>("app.logLevel", "info"),
          configService.get<string>("app.logDir", "./logs"),
        ),
    },
  ],
  exports: [WinstonLogger],
})
export class LoggingModule {}
