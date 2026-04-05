import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import * as jose from "jose";
import { IS_PUBLIC_KEY } from "@common/decorators";
import { JwtPayload, RequestUser } from "@common/interfaces";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      const token = this.extractTokenFromHeader(request);
      if (token) {
        try {
          await this.attachUserToRequest(request, token);
        } catch {
          // Public routes stay accessible even when an optional token is invalid.
        }
      }
      return true;
    }

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException("Missing authentication token");
    }

    try {
      await this.attachUserToRequest(request, token);
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  private async attachUserToRequest(
    request: { headers: Record<string, string>; user?: RequestUser },
    token: string,
  ): Promise<void> {
    const secret = new TextEncoder().encode(
      this.configService.get<string>("auth.jwtAccessSecret"),
    );
    const issuer = this.configService.get<string>("auth.jwtIssuer");

    const { payload } = await jose.jwtVerify(token, secret, {
      issuer,
    });

    const jwtPayload = payload as unknown as JwtPayload;

    request.user = {
      id: jwtPayload.sub,
      email: jwtPayload.email,
      roles: jwtPayload.roles,
      permissions: jwtPayload.permissions,
      sessionId: jwtPayload.sessionId,
    };
  }

  private extractTokenFromHeader(request: {
    headers: Record<string, string>;
  }): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
