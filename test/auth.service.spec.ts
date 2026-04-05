import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../src/modules/auth/auth.service";
import {
  UserEntity,
  RoleEntity,
  RefreshTokenEntity,
} from "../src/modules/users/entities/user.entity";
import { AuditLogService } from "../src/modules/audit-logs/audit-log.service";
import * as argon2 from "argon2";

describe("AuthService", () => {
  let service: AuthService;
  let userRepo: any;
  let refreshTokenRepo: any;
  let auditLogService: any;

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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
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
                "auth.jwtSecret":
                  "test-secret-key-that-is-at-least-32-chars-long!!",
                "auth.jwtExpiresIn": "15m",
                "auth.refreshTokenExpiresIn": "7d",
                "auth.encryptionKey": "a".repeat(64),
              };
              return configs[key];
            }),
          },
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
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login(
          { email: "nonexistent@test.com", password: "pass" },
          "127.0.0.1",
          "test-agent",
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException for inactive user", async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(
        service.login(
          { email: "test@example.com", password: "Password123!" },
          "127.0.0.1",
          "test-agent",
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException for wrong password", async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser });
      userRepo.save.mockResolvedValue({ ...mockUser, failedLoginAttempts: 1 });

      await expect(
        service.login(
          { email: "test@example.com", password: "WrongPassword!" },
          "127.0.0.1",
          "test-agent",
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should return tokens on successful login", async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser });
      userRepo.save.mockResolvedValue({ ...mockUser, failedLoginAttempts: 0 });

      const result = await service.login(
        { email: "test@example.com", password: "Password123!" },
        "127.0.0.1",
        "test-agent",
      );

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result).toHaveProperty("expiresIn");
      expect(auditLogService.log).toHaveBeenCalled();
    });
  });
});
