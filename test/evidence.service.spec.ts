import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { EvidenceService } from "../src/modules/evidence/evidence.service";
import {
  EvidenceEntity,
  EvidenceChainOfCustodyEntity,
} from "../src/modules/evidence/entities/evidence.entity";
import { AuditLogService } from "../src/modules/audit-logs/audit-log.service";
import { DataSource } from "typeorm";

describe("EvidenceService", () => {
  let service: EvidenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvidenceService,
        {
          provide: getRepositoryToken(EvidenceEntity),
          useValue: {
            create: jest.fn().mockImplementation((dto) => dto),
            save: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn().mockResolvedValue([[], 0]),
          },
        },
        {
          provide: getRepositoryToken(EvidenceChainOfCustodyEntity),
          useValue: {
            create: jest.fn().mockImplementation((dto) => dto),
            save: jest.fn(),
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: AuditLogService,
          useValue: { log: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              manager: {
                save: jest.fn().mockImplementation((entity) => entity),
              },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EvidenceService>(EvidenceService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
