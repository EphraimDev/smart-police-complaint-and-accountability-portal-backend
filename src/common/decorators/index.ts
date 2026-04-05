import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import { Permission } from "@common/enums";
import { RequestUser } from "@common/interfaces";
import { Request } from "express";

export const PERMISSIONS_KEY = "permissions";
export const IS_PUBLIC_KEY = "isPublic";
export const AUDIT_ACTION_KEY = "auditAction";
export const IDEMPOTENT_KEY = "idempotent";

export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const AuditLog = (action: string) =>
  SetMetadata(AUDIT_ACTION_KEY, action);

export const Idempotent = () => SetMetadata(IDEMPOTENT_KEY, true);

export const CurrentUser = createParamDecorator(
  (
    data: keyof RequestUser | undefined,
    ctx: ExecutionContext,
  ): RequestUser | unknown => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: RequestUser }>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

export const CorrelationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return (request.headers["x-correlation-id"] as string) || "unknown";
  },
);

export const ClientIp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return (
      (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      request.ip ||
      "unknown"
    );
  },
);
