import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { catchError, map, tap } from "rxjs/operators";
import { ApiResponse } from "@common/interfaces";
import { WinstonLogger } from "@common/utils/winston.logger";
import { sanitizeForLog } from "@common/utils";
import { Request, Response } from "express";

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  constructor(private readonly logger: WinstonLogger) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const correlationId =
      (request.headers["x-correlation-id"] as string) || "unknown";

    this.logger.log(
      JSON.stringify({
        stage: "request",
        method: request.method,
        url: request.originalUrl,
        correlationId,
        request: sanitizeForLog(request.body),
      }),
      "HTTP",
    );

    return next.handle().pipe(
      map((data) => {
        let result: ApiResponse<T>;

        if (data && typeof data === "object" && "success" in data) {
          result = data as ApiResponse<T>;
        } else {
          result = {
            success: true,
            message: "Success",
            correlationId,
          };

          if (data !== undefined && data !== null) {
            if (typeof data === "object" && "data" in data && "meta" in data) {
              result.data = (data as { data: T }).data;
              result.meta = (data as { meta: Record<string, unknown> }).meta;
            } else {
              result.data = data;
            }
          }
        }

        return result;
      }),
      tap((result) => {
        this.logger.log(
          JSON.stringify({
            stage: "response",
            method: request.method,
            url: request.originalUrl,
            statusCode: response.statusCode,
            correlationId,
            request: sanitizeForLog(request.body),
            response: sanitizeForLog(result.data),
          }),
          "HTTP",
        );
      }),
      catchError((error: unknown) => {
        this.logger.error(
          JSON.stringify({
            stage: "error",
            method: request.method,
            url: request.originalUrl,
            statusCode:
              typeof response.statusCode === "number" ? response.statusCode : 500,
            correlationId,
            request: sanitizeForLog(request.body),
            error:
              error instanceof Error
                ? {
                    name: error.name,
                    message: error.message,
                  }
                : error,
          }),
          error instanceof Error ? error.stack : undefined,
          "HTTP",
        );

        return throwError(() => error);
      }),
    );
  }
}
