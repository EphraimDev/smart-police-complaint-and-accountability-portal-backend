import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ApiResponse } from "@common/interfaces";
import { sanitizeForLog } from "@common/utils";
import { WinstonLogger } from "@common/utils/winston.logger";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: WinstonLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId =
      (request.headers["x-correlation-id"] as string) || "unknown";

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === "object" &&
        exceptionResponse !== null
      ) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || exception.message;
        if (Array.isArray(resp.message)) {
          message = "Validation failed";
          details = resp.message;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
        "GlobalExceptionFilter",
      );
    } else {
      this.logger.error(
        `Unknown exception: ${String(exception)}`,
        undefined,
        "GlobalExceptionFilter",
      );
    }

    const isProduction = process.env.NODE_ENV === "production";

    const body: ApiResponse = {
      success: false,
      message:
        isProduction && status === HttpStatus.INTERNAL_SERVER_ERROR
          ? "Internal server error"
          : message,
      correlationId,
      ...(details && !isProduction ? { data: details } : {}),
    };

    // this.logger.error(
    //   JSON.stringify({
    //     stage: "error-response",
    //     method: request.method,
    //     url: request.originalUrl,
    //     statusCode: status,
    //     correlationId,
    //     request: sanitizeForLog(request.body),
    //     response: sanitizeForLog(body),
    //   }),
    //   exception instanceof Error ? exception.stack : undefined,
    //   "HTTP",
    // );

    response.status(status).json(body);
  }
}
