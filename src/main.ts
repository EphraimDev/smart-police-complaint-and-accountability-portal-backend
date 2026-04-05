import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { WinstonLogger } from "@common/utils/winston.logger";
import { globalValidationPipe } from "@common/pipes";
import { GlobalExceptionFilter } from "@common/filters";
import { ResponseTransformInterceptor } from "@common/interceptors";
import { RequestTimingInterceptor } from "@common/interceptors";
import { setupSwagger } from "@config/swagger.config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);

  const logLevel = configService.get<string>("app.logLevel", "info");
  const logDir = configService.get<string>("app.logDir", "./logs");
  const logger = new WinstonLogger(logLevel, logDir);
  app.useLogger(logger);

  app.use(helmet());

  const corsOrigin = configService.get<string>(
    "app.corsOrigin",
    "http://localhost:3001",
  );
  app.enableCors({
    origin: corsOrigin.split(","),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-correlation-id",
      "x-idempotency-key",
    ],
    credentials: true,
    maxAge: 3600,
  });

  const apiPrefix = configService.get<string>("app.apiPrefix", "api/v1");
  app.setGlobalPrefix(apiPrefix);

  app.useGlobalPipes(globalValidationPipe);
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(
    new RequestTimingInterceptor(),
    new ResponseTransformInterceptor(),
  );

  const swaggerEnabled = configService.get<boolean>("app.swaggerEnabled", true);
  if (swaggerEnabled) {
    setupSwagger(app);
  }

  const port = configService.get<number>("app.port", 3000);
  await app.listen(port);

  logger.log(`Application running on port ${port}`, "Bootstrap");
  logger.log(`API prefix: ${apiPrefix}`, "Bootstrap");
  if (swaggerEnabled) {
    logger.log(`Swagger docs available at /docs`, "Bootstrap");
  }
}

bootstrap();
