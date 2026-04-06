import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { OfficersService } from "../src/modules/officers/officers.service";
import { OfficerEntity } from "../src/modules/officers/entities/officer.entity";
import { AuditLogService } from "../src/modules/audit-logs/audit-log.service";

describe("OfficersService", () => {
  let service: OfficersService;
  let officerRepository: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfficersService,
        {
          provide: getRepositoryToken(OfficerEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn().mockImplementation((dto) => ({
              id: "officer-1",
              ...dto,
            })),
            save: jest.fn().mockImplementation((entity) => entity),
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

    service = module.get<OfficersService>(OfficersService);
    officerRepository = module.get(getRepositoryToken(OfficerEntity));
  });

  describe("bulkUpload", () => {
    it("creates valid officers and reports invalid rows", async () => {
      officerRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const csv = [
        "badgeNumber,serviceNumber,firstName,lastName,rank,unit,joinedDate",
        "B001,S001,Jane,Doe,Inspector,Investigations,2026-01-01",
        "B002,,John,,Sergeant,,",
        "B003,S003,Amina,Bello,Corporal,Patrol,2026-02-01",
      ].join("\n");

      const result = await service.bulkUpload(
        {
          buffer: Buffer.from(csv, "utf-8"),
          originalname: "officers.csv",
        },
        "station-uuid-1",
        "actor-1",
      );

      expect(result.totalRows).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.createdOfficers).toHaveLength(2);
      expect(result.errors).toEqual([
        expect.objectContaining({
          row: 3,
          badgeNumber: "B002",
        }),
      ]);
    });
  });
});
