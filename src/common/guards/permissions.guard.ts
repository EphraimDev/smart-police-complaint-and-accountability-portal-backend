import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "@common/decorators";
import { Permission } from "@common/enums";
import { RequestUser } from "@common/interfaces";
import { WinstonLogger } from "@common/utils/winston.logger";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly logger: WinstonLogger,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: RequestUser = request.user;
    const correlationId =
      (request.headers["x-correlation-id"] as string) || "unknown";

    if (!user || !user.permissions) {
      this.logger.warn(
        JSON.stringify({
          stage: "authorization",
          outcome: "denied",
          reason: "missing-user-permissions",
          method: request.method,
          url: request.originalUrl,
          correlationId,
          requiredPermissions,
        }),
        "HTTP",
      );
      throw new ForbiddenException("Insufficient permissions1");
    }

    const hasPermission = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );

    if (!hasPermission) {
      this.logger.warn(
        JSON.stringify({
          stage: "authorization",
          outcome: "denied",
          reason: "insufficient-permissions",
          method: request.method,
          url: request.originalUrl,
          correlationId,
          userId: user.id,
          requiredPermissions,
          userPermissions: user.permissions,
        }),
        "HTTP",
      );
      throw new ForbiddenException("Insufficient permissions2");
    }

    return true;
  }
}
