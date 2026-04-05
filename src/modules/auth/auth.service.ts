import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, LessThan } from "typeorm";
import * as argon2 from "argon2";
import * as jose from "jose";
import { v4 as uuidv4 } from "uuid";
import {
  UserEntity,
  RefreshTokenEntity,
  RoleEntity,
} from "@modules/users/entities/user.entity";
import {
  LoginDto,
  RefreshTokenDto,
  AuthResponseDto,
  ChangePasswordDto,
} from "./dto/auth.dto";
import { JwtPayload } from "@common/interfaces";
import { Permission, UserRole, AuditAction } from "@common/enums";
import { EncryptionUtil } from "@shared/security";
import { APP_CONSTANTS } from "@common/constants";
import { parseTimeString } from "@common/utils";
import { AuditLogService } from "@modules/audit-logs/audit-log.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
  ) {}

  async login(
    dto: LoginDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthResponseDto> {
    const user = await this.userRepository
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .leftJoinAndSelect("user.roles", "roles")
      .leftJoinAndSelect("roles.permissions", "permissions")
      .where("user.email = :email", { email: dto.email.toLowerCase() })
      .getOne();

    if (!user) {
      await this.auditLogService.log({
        action: AuditAction.LOGIN_FAILED,
        entityType: "auth",
        ipAddress,
        userAgent,
        outcome: "failure",
        failureReason: "User not found",
        metadata: { email: "[ATTEMPTED]" },
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Account is deactivated");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        "Account is temporarily locked. Try again later.",
      );
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );
    if (!isPasswordValid) {
      await this.handleFailedLogin(user, ipAddress, userAgent);
      throw new UnauthorizedException("Invalid credentials");
    }

    // Reset failed attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await this.userRepository.update(user.id, {
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
    }

    const sessionId = uuidv4();
    const permissions = this.extractPermissions(user.roles);
    const roleNames = user.roles.map((r) => r.name as UserRole);

    const tokens = await this.generateTokenPair(
      user,
      roleNames,
      permissions,
      sessionId,
    );

    const refreshTokenHash = EncryptionUtil.hash(tokens.refreshToken);
    const refreshExpMs = parseTimeString(
      this.configService.get<string>("auth.jwtRefreshExpiration", "7d"),
    );

    await this.refreshTokenRepository.save({
      userId: user.id,
      tokenHash: refreshTokenHash,
      sessionId,
      ipAddress,
      deviceInfo: dto.deviceInfo
        ? { userAgent, deviceInfo: dto.deviceInfo }
        : { userAgent },
      expiresAt: new Date(Date.now() + refreshExpMs),
    });

    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
    });

    await this.auditLogService.log({
      actorId: user.id,
      action: AuditAction.LOGIN,
      entityType: "auth",
      entityId: user.id,
      ipAddress,
      userAgent,
      outcome: "success",
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: roleNames,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: this.configService.get<string>(
          "auth.jwtAccessExpiration",
          "15m",
        ),
        tokenType: "Bearer",
      },
    };
  }

  async refreshTokens(
    dto: RefreshTokenDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: string }> {
    const tokenHash = EncryptionUtil.hash(dto.refreshToken);

    const existingToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });

    if (!existingToken) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (existingToken.isRevoked) {
      // Potential token reuse attack - revoke all tokens for this user
      await this.revokeAllUserTokens(
        existingToken.userId,
        "Potential token reuse detected",
      );
      this.logger.warn(
        `Potential token reuse attack for user ${existingToken.userId}`,
      );
      throw new UnauthorizedException(
        "Token has been revoked. All sessions terminated.",
      );
    }

    if (existingToken.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token expired");
    }

    const user = await this.userRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.roles", "roles")
      .leftJoinAndSelect("roles.permissions", "permissions")
      .where("user.id = :id", { id: existingToken.userId })
      .getOne();

    if (!user || !user.isActive) {
      throw new UnauthorizedException("User not found or inactive");
    }

    // Rotate token
    await this.refreshTokenRepository.update(existingToken.id, {
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: "Token rotation",
    });

    const sessionId = existingToken.sessionId;
    const permissions = this.extractPermissions(user.roles);
    const roleNames = user.roles.map((r) => r.name as UserRole);
    const tokens = await this.generateTokenPair(
      user,
      roleNames,
      permissions,
      sessionId,
    );

    const newRefreshTokenHash = EncryptionUtil.hash(tokens.refreshToken);
    const refreshExpMs = parseTimeString(
      this.configService.get<string>("auth.jwtRefreshExpiration", "7d"),
    );

    await this.refreshTokenRepository.save({
      userId: user.id,
      tokenHash: newRefreshTokenHash,
      sessionId,
      ipAddress,
      deviceInfo: { userAgent },
      expiresAt: new Date(Date.now() + refreshExpMs),
    });

    await this.auditLogService.log({
      actorId: user.id,
      action: AuditAction.TOKEN_REFRESH,
      entityType: "auth",
      entityId: user.id,
      ipAddress,
      userAgent,
      outcome: "success",
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: this.configService.get<string>(
        "auth.jwtAccessExpiration",
        "15m",
      ),
    };
  }

  async logout(
    userId: string,
    refreshToken: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const tokenHash = EncryptionUtil.hash(refreshToken);

    const token = await this.refreshTokenRepository.findOne({
      where: { tokenHash, userId },
    });

    if (token && !token.isRevoked) {
      await this.refreshTokenRepository.update(token.id, {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: "User logout",
      });
    }

    await this.auditLogService.log({
      actorId: userId,
      action: AuditAction.LOGOUT,
      entityType: "auth",
      entityId: userId,
      ipAddress,
      userAgent,
      outcome: "success",
    });
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const user = await this.userRepository
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("user.id = :id", { id: userId })
      .getOne();

    if (!user) {
      throw new BadRequestException("User not found");
    }

    const isCurrentValid = await argon2.verify(
      user.passwordHash,
      dto.currentPassword,
    );
    if (!isCurrentValid) {
      throw new BadRequestException("Current password is incorrect");
    }

    const newHash = await argon2.hash(dto.newPassword);
    await this.userRepository.update(userId, { passwordHash: newHash });

    // Revoke all refresh tokens to force re-login
    await this.revokeAllUserTokens(userId, "Password changed");

    await this.auditLogService.log({
      actorId: userId,
      action: AuditAction.PASSWORD_CHANGE,
      entityType: "user",
      entityId: userId,
      ipAddress,
      userAgent,
      outcome: "success",
    });
  }

  private async handleFailedLogin(
    user: UserEntity,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const attempts = user.failedLoginAttempts + 1;
    const updateData: Partial<UserEntity> = { failedLoginAttempts: attempts };

    if (attempts >= APP_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
      updateData.lockedUntil = new Date(
        Date.now() + APP_CONSTANTS.LOCKOUT_DURATION_MINUTES * 60 * 1000,
      );
      this.logger.warn(
        `Account locked for user ${user.id} after ${attempts} failed attempts`,
      );
    }

    await this.userRepository.update(user.id, updateData);

    await this.auditLogService.log({
      actorId: user.id,
      action: AuditAction.LOGIN_FAILED,
      entityType: "auth",
      entityId: user.id,
      ipAddress,
      userAgent,
      outcome: "failure",
      failureReason: `Failed attempt ${attempts}/${APP_CONSTANTS.MAX_LOGIN_ATTEMPTS}`,
    });
  }

  private async revokeAllUserTokens(
    userId: string,
    reason: string,
  ): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date(), revokedReason: reason },
    );
  }

  private async generateTokenPair(
    user: UserEntity,
    roles: UserRole[],
    permissions: Permission[],
    sessionId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessSecret = new TextEncoder().encode(
      this.configService.get<string>("auth.jwtAccessSecret"),
    );
    const refreshSecret = new TextEncoder().encode(
      this.configService.get<string>("auth.jwtRefreshSecret"),
    );
    const issuer = this.configService.get<string>(
      "auth.jwtIssuer",
      "complaint-portal",
    );
    const accessExp = this.configService.get<string>(
      "auth.jwtAccessExpiration",
      "15m",
    );
    const refreshExp = this.configService.get<string>(
      "auth.jwtRefreshExpiration",
      "7d",
    );

    const payload: Omit<JwtPayload, "iat" | "exp" | "iss"> = {
      sub: user.id,
      email: user.email,
      roles,
      permissions,
      sessionId,
    };

    const accessToken = await new jose.SignJWT(
      payload as unknown as jose.JWTPayload,
    )
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer(issuer)
      .setExpirationTime(accessExp)
      .sign(accessSecret);

    const refreshToken = await new jose.SignJWT({
      sub: user.id,
      sessionId,
    } as unknown as jose.JWTPayload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer(issuer)
      .setExpirationTime(refreshExp)
      .sign(refreshSecret);

    return { accessToken, refreshToken };
  }

  private extractPermissions(roles: RoleEntity[]): Permission[] {
    const permissionSet = new Set<Permission>();
    for (const role of roles) {
      if (role.permissions) {
        for (const perm of role.permissions) {
          permissionSet.add(perm.name as Permission);
        }
      }
    }
    return Array.from(permissionSet);
  }

  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected || 0;
  }
}
