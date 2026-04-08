import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import * as rtracer from "cls-rtracer";
import { AppModule } from "./app.module";
import { setupSwagger } from "@config/swagger.config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  app.use(rtracer.expressMiddleware());

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
      "x-payload-encrypted",
    ],
    exposedHeaders: [
      "x-correlation-id",
      "x-payload-encrypted",
    ],
    credentials: true,
    maxAge: 3600,
  });

  const apiPrefix = configService.get<string>("app.apiPrefix", "api/v1");
  app.setGlobalPrefix(apiPrefix);

  const swaggerEnabled = configService.get<boolean>("app.swaggerEnabled", true);
  if (swaggerEnabled) {
    setupSwagger(app);
  }

  const port = configService.get<number>("app.port", 3000);
  await app.listen(port);

  console.log(`Application running on port ${port}`);
  console.log(`API prefix: ${apiPrefix}`);
  if (swaggerEnabled) {
    console.log(`Swagger docs available at /docs`);
  }
}

bootstrap();
