import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ComplaintEntity } from "@modules/complaints/entities/complaint.entity";
import { UserEntity } from "@modules/users/entities/user.entity";
import { OfficerEntity } from "@modules/officers/entities/officer.entity";
import { PoliceStationEntity } from "@modules/police-stations/entities/police-station.entity";
import { EscalationRecordEntity } from "@modules/oversight/entities/escalation-record.entity";

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(ComplaintEntity)
    private readonly complaintRepository: Repository<ComplaintEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(OfficerEntity)
    private readonly officerRepository: Repository<OfficerEntity>,
    @InjectRepository(PoliceStationEntity)
    private readonly stationRepository: Repository<PoliceStationEntity>,
    @InjectRepository(EscalationRecordEntity)
    private readonly escalationRepository: Repository<EscalationRecordEntity>,
  ) {}

  async getDashboardSummary() {
    const [
      totalComplaints,
      openComplaints,
      resolvedComplaints,
      totalUsers,
      activeUsers,
      totalOfficers,
      totalStations,
      pendingEscalations,
    ] = await Promise.all([
      this.complaintRepository.count(),
      this.complaintRepository.count({
        where: [
          { status: "SUBMITTED" as any },
          { status: "UNDER_REVIEW" as any },
          { status: "UNDER_INVESTIGATION" as any },
          { status: "ASSIGNED" as any },
        ],
      }),
      this.complaintRepository.count({
        where: [{ status: "RESOLVED" as any }, { status: "CLOSED" as any }],
      }),
      this.userRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
      this.officerRepository.count(),
      this.stationRepository.count(),
      this.escalationRepository.count({ where: { status: "PENDING" as any } }),
    ]);

    const overdueComplaints = await this.complaintRepository
      .createQueryBuilder("c")
      .where("c.slaDueDate < NOW()")
      .andWhere("c.status NOT IN (:...terminal)", {
        terminal: ["RESOLVED", "CLOSED", "WITHDRAWN"],
      })
      .getCount();

    const recentComplaints = await this.complaintRepository.find({
      order: { createdAt: "DESC" },
      take: 10,
      select: [
        "id",
        "referenceNumber",
        "title",
        "status",
        "severity",
        "createdAt",
      ],
    });

    return {
      stats: {
        totalComplaints,
        openComplaints,
        resolvedComplaints,
        overdueComplaints,
        totalUsers,
        activeUsers,
        totalOfficers,
        totalStations,
        pendingEscalations,
      },
      recentComplaints,
    };
  }

  async getSystemHealth() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [complaintsToday, usersToday] = await Promise.all([
      this.complaintRepository
        .createQueryBuilder("c")
        .where("c.createdAt >= :date", { date: oneDayAgo })
        .getCount(),
      this.userRepository
        .createQueryBuilder("u")
        .where("u.createdAt >= :date", { date: oneDayAgo })
        .getCount(),
    ]);

    return {
      last24Hours: {
        newComplaints: complaintsToday,
        newUsers: usersToday,
      },
    };
  }
}
