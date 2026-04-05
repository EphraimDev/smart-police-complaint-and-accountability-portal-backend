import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ApiResponse } from "@common/interfaces";
import { Request } from "express";

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const correlationId =
      (request.headers["x-correlation-id"] as string) || "unknown";

    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === "object" && "success" in data) {
          return data as ApiResponse<T>;
        }

        const result: ApiResponse<T> = {
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

        return result;
      }),
    );
  }
}
