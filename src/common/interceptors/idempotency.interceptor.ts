import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, of } from "rxjs";
import { tap } from "rxjs/operators";
import Redis from "ioredis";
import { IDEMPOTENT_KEY } from "@common/decorators";
import { APP_CONSTANTS } from "@common/constants";

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: Redis,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const isIdempotent = this.reflector.getAllAndOverride<boolean>(
      IDEMPOTENT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isIdempotent) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers[
      APP_CONSTANTS.IDEMPOTENCY_KEY_HEADER
    ] as string;

    if (!idempotencyKey) {
      return next.handle();
    }

    const cacheKey = `idempotency:${idempotencyKey}`;
    const existing = await this.redis.get(cacheKey);

    if (existing) {
      const parsed = JSON.parse(existing);
      if (parsed.status === "processing") {
        throw new ConflictException("Request is already being processed");
      }
      return of(parsed.response);
    }

    await this.redis.set(
      cacheKey,
      JSON.stringify({ status: "processing" }),
      "EX",
      3600,
    );

    return next.handle().pipe(
      tap(async (response) => {
        await this.redis.set(
          cacheKey,
          JSON.stringify({ status: "completed", response }),
          "EX",
          86400,
        );
      }),
    );
  }
}
