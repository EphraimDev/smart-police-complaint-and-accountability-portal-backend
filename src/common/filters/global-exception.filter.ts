import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ApiResponse } from "@common/interfaces";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

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
        `CorrelationId: ${correlationId}`,
      );
    } else {
      this.logger.error(
        `Unknown exception: ${String(exception)}`,
        `CorrelationId: ${correlationId}`,
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

    response.status(status).json(body);
  }
}
