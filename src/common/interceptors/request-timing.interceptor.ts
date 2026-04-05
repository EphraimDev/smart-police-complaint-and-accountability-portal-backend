import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Request, Response } from "express";

@Injectable()
export class RequestTimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const correlationId =
      (request.headers["x-correlation-id"] as string) || "unknown";
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const { method, originalUrl } = request;
        const statusCode = response.statusCode;

        this.logger.log(
          JSON.stringify({
            method,
            url: originalUrl,
            statusCode,
            duration: `${duration}ms`,
            correlationId,
            userId:
              (request as unknown as { user?: { id: string } }).user?.id ||
              "anonymous",
          }),
        );
      }),
    );
  }
}
