import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { ComplaintsService } from "../src/modules/complaints/complaints.service";
import {
  ComplaintEntity,
  ComplaintNoteEntity,
} from "../src/modules/complaints/entities/complaint.entity";
import { ComplaintStatusHistoryEntity } from "../src/modules/complaint-status-history/entities/complaint-status-history.entity";
import { AuditLogService } from "../src/modules/audit-logs/audit-log.service";
import { DataSource } from "typeorm";
import { Queue } from "bullmq";

describe("ComplaintsService", () => {
  let service: ComplaintsService;
  let complaintRepo: any;

  const mockComplaint: Partial<ComplaintEntity> = {
    id: "complaint-uuid-1",
    referenceNumber: "SPCAP-20240101-ABC123",
    title: "Test Complaint",
    description: "Test description",
    status: "SUBMITTED" as any,
    severity: "MEDIUM" as any,
    category: "MISCONDUCT" as any,
    citizenUserId: "user-uuid-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplaintsService,
        {
          provide: getRepositoryToken(ComplaintEntity),
          useValue: {
            create: jest
              .fn()
              .mockImplementation((dto) => ({ id: "new-uuid", ...dto })),
            save: jest
              .fn()
              .mockImplementation((entity) => ({
                ...mockComplaint,
                ...entity,
              })),
            findOne: jest.fn(),
            findAndCount: jest.fn().mockResolvedValue([[mockComplaint], 1]),
            createQueryBuilder: jest.fn().mockReturnValue({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getManyAndCount: jest
                .fn()
                .mockResolvedValue([[mockComplaint], 1]),
            }),
          },
        },
        {
          provide: getRepositoryToken(ComplaintStatusHistoryEntity),
          useValue: {
            create: jest.fn().mockImplementation((dto) => dto),
            save: jest.fn(),
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(ComplaintNoteEntity),
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
                findOne: jest.fn(),
              },
            }),
          },
        },
        {
          provide: "BullQueue_ai-analysis",
          useValue: { add: jest.fn() },
        },
        {
          provide: "BullQueue_notifications",
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ComplaintsService>(ComplaintsService);
    complaintRepo = module.get(getRepositoryToken(ComplaintEntity));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findById", () => {
    it("should return a complaint when found", async () => {
      complaintRepo.findOne.mockResolvedValue(mockComplaint);

      const result = await service.findById("complaint-uuid-1");
      expect(result).toEqual(mockComplaint);
    });

    it("should throw NotFoundException when complaint not found", async () => {
      complaintRepo.findOne.mockResolvedValue(null);

      await expect(service.findById("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findByReference", () => {
    it("should return a complaint when found by reference number", async () => {
      complaintRepo.findOne.mockResolvedValue(mockComplaint);

      const result = await service.findByReference("SPCAP-20240101-ABC123");
      expect(result).toEqual(mockComplaint);
    });
  });
});
