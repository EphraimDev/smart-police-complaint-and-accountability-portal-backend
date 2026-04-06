import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { AuthService } from "../src/modules/auth/auth.service";
import {
  UserEntity,
  RefreshTokenEntity,
} from "../src/modules/users/entities/user.entity";
import { AuditLogService } from "../src/modules/audit-logs/audit-log.service";
import * as argon2 from "argon2";

describe("AuthService", () => {
  let service: AuthService;
  let userRepo: any;
  let refreshTokenRepo: any;
  let auditLogService: any;
  let loginQueryBuilder: any;

  const mockUser: Partial<UserEntity> = {
    id: "user-uuid-1",
    email: "test@example.com",
    passwordHash: "",
    firstName: "Test",
    lastName: "User",
    isActive: true,
    isEmailVerified: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    roles: [{ id: "role-1", name: "COMPLAINANT", permissions: [] } as any],
  };

  beforeAll(async () => {
    mockUser.passwordHash = await argon2.hash("Password123!");
  });

  beforeEach(async () => {
    loginQueryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(loginQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(RefreshTokenEntity),
          useValue: {
            create: jest.fn().mockImplementation((dto) => dto),
            save: jest
              .fn()
              .mockImplementation((dto) => ({ id: "rt-1", ...dto })),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const configs: Record<string, any> = {
                "auth.jwtAccessSecret":
                  "test-secret-key-that-is-at-least-32-chars-long!!",
                "auth.jwtRefreshSecret":
                  "refresh-secret-key-that-is-at-least-32-chars",
                "auth.jwtAccessExpiration": "15m",
                "auth.jwtRefreshExpiration": "7d",
                "auth.jwtIssuer": "complaint-portal",
              };
              return configs[key];
            }),
          },
        },
        {
          provide: DataSource,
          useValue: {},
        },
        {
          provide: AuditLogService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(UserEntity));
    refreshTokenRepo = module.get(getRepositoryToken(RefreshTokenEntity));
    auditLogService = module.get(AuditLogService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("login", () => {
    it("should throw UnauthorizedException for non-existent user", async () => {
      loginQueryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.login(
          { email: "nonexistent@test.com", password: "pass" },
          "127.0.0.1",
          "test-agent",
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException for inactive user", async () => {
      loginQueryBuilder.getOne.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        service.login(
          { email: "test@example.com", password: "Password123!" },
          "127.0.0.1",
          "test-agent",
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException when password login is unavailable", async () => {
      loginQueryBuilder.getOne.mockResolvedValue({
        ...mockUser,
        passwordHash: null,
      });

      await expect(
        service.login(
          { email: "test@example.com", password: "Password123!" },
          "127.0.0.1",
          "test-agent",
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.anything(),
          entityId: mockUser.id,
          failureReason: "Password login unavailable for this account",
          outcome: "failure",
        }),
      );
    });

    it("should throw UnauthorizedException for wrong password", async () => {
      loginQueryBuilder.getOne.mockResolvedValue({ ...mockUser });

      await expect(
        service.login(
          { email: "test@example.com", password: "WrongPassword!" },
          "127.0.0.1",
          "test-agent",
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should return tokens on successful login", async () => {
      loginQueryBuilder.getOne.mockResolvedValue({ ...mockUser });

      const result = await service.login(
        { email: "test@example.com", password: "Password123!" },
        "127.0.0.1",
        "test-agent",
      );

      expect(result).toHaveProperty("tokens.accessToken");
      expect(result).toHaveProperty("tokens.refreshToken");
      expect(result).toHaveProperty("tokens.expiresIn");
      expect(auditLogService.log).toHaveBeenCalled();
    });
  });
});
