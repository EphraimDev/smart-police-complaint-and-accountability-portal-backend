import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { UsersService } from "../src/modules/users/users.service";
import {
  UserEntity,
  RoleEntity,
} from "../src/modules/users/entities/user.entity";
import { AuditLogService } from "../src/modules/audit-logs/audit-log.service";

describe("UsersService", () => {
  let service: UsersService;
  let userRepo: any;

  const mockUser: Partial<UserEntity> = {
    id: "user-uuid-1",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    isActive: true,
    roles: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            create: jest
              .fn()
              .mockImplementation((dto) => ({ id: "new-uuid", ...dto })),
            save: jest
              .fn()
              .mockImplementation((entity) => ({ ...mockUser, ...entity })),
            findOne: jest.fn(),
            findAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
            createQueryBuilder: jest.fn().mockReturnValue({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
            }),
          },
        },
        {
          provide: getRepositoryToken(RoleEntity),
          useValue: {
            findByIds: jest.fn().mockResolvedValue([]),
            findOne: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: { log: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get(getRepositoryToken(UserEntity));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return paginated users", async () => {
      const result = await service.findAll({
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "DESC",
        get skip() {
          return 0;
        },
      } as any);

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
    });
  });
});
