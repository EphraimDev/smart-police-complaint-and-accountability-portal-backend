import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, FindOptionsWhere } from "typeorm";
import { ComplaintEntity } from "@modules/complaints/entities/complaint.entity";
import { EscalationRecordEntity } from "@modules/oversight/entities/escalation-record.entity";
import { ReportFiltersDto } from "./dto/reports.dto";

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(ComplaintEntity)
    private readonly complaintRepository: Repository<ComplaintEntity>,
    @InjectRepository(EscalationRecordEntity)
    private readonly escalationRepository: Repository<EscalationRecordEntity>,
  ) {}

  async getComplaintSummary(filters: ReportFiltersDto) {
    const qb = this.complaintRepository.createQueryBuilder("c");

    if (filters.startDate && filters.endDate) {
      qb.andWhere("c.createdAt BETWEEN :start AND :end", {
        start: filters.startDate,
        end: filters.endDate,
      });
    }
    if (filters.stationId) {
      qb.andWhere("c.stationId = :stationId", { stationId: filters.stationId });
    }
    if (filters.category) {
      qb.andWhere("c.category = :category", { category: filters.category });
    }

    const totalComplaints = await qb.getCount();

    const byStatus = await this.complaintRepository
      .createQueryBuilder("c")
      .select("c.status", "status")
      .addSelect("COUNT(*)", "count")
      .where(
        filters.startDate && filters.endDate
          ? "c.createdAt BETWEEN :start AND :end"
          : "1=1",
        {
          start: filters.startDate,
          end: filters.endDate,
        },
      )
      .groupBy("c.status")
      .getRawMany();

    const byCategory = await this.complaintRepository
      .createQueryBuilder("c")
      .select("c.category", "category")
      .addSelect("COUNT(*)", "count")
      .where(
        filters.startDate && filters.endDate
          ? "c.createdAt BETWEEN :start AND :end"
          : "1=1",
        {
          start: filters.startDate,
          end: filters.endDate,
        },
      )
      .groupBy("c.category")
      .getRawMany();

    const bySeverity = await this.complaintRepository
      .createQueryBuilder("c")
      .select("c.severity", "severity")
      .addSelect("COUNT(*)", "count")
      .where(
        filters.startDate && filters.endDate
          ? "c.createdAt BETWEEN :start AND :end"
          : "1=1",
        {
          start: filters.startDate,
          end: filters.endDate,
        },
      )
      .groupBy("c.severity")
      .getRawMany();

    return {
      totalComplaints,
      byStatus,
      byCategory,
      bySeverity,
    };
  }

  async getResolutionMetrics(filters: ReportFiltersDto) {
    const qb = this.complaintRepository
      .createQueryBuilder("c")
      .where("c.status IN (:...resolved)", {
        resolved: ["RESOLVED", "CLOSED"],
      });

    if (filters.startDate && filters.endDate) {
      qb.andWhere("c.createdAt BETWEEN :start AND :end", {
        start: filters.startDate,
        end: filters.endDate,
      });
    }

    const avgResolution = await qb
      .select(
        "AVG(EXTRACT(EPOCH FROM (c.updatedAt - c.createdAt)) / 3600)",
        "avgHours",
      )
      .addSelect(
        "MIN(EXTRACT(EPOCH FROM (c.updatedAt - c.createdAt)) / 3600)",
        "minHours",
      )
      .addSelect(
        "MAX(EXTRACT(EPOCH FROM (c.updatedAt - c.createdAt)) / 3600)",
        "maxHours",
      )
      .addSelect("COUNT(*)", "resolved")
      .getRawOne();

    return {
      averageResolutionHours: parseFloat(avgResolution.avgHours) || 0,
      minResolutionHours: parseFloat(avgResolution.minHours) || 0,
      maxResolutionHours: parseFloat(avgResolution.maxHours) || 0,
      totalResolved: parseInt(avgResolution.resolved, 10) || 0,
    };
  }

  async getOverdueComplaints(filters: ReportFiltersDto) {
    const qb = this.complaintRepository
      .createQueryBuilder("c")
      .where("c.slaDueDate < NOW()")
      .andWhere("c.status NOT IN (:...terminal)", {
        terminal: ["RESOLVED", "CLOSED", "WITHDRAWN"],
      });

    if (filters.stationId) {
      qb.andWhere("c.stationId = :stationId", { stationId: filters.stationId });
    }

    const overdueCount = await qb.getCount();

    const overdueByCategory = await qb
      .select("c.category", "category")
      .addSelect("COUNT(*)", "count")
      .groupBy("c.category")
      .getRawMany();

    return {
      overdueCount,
      overdueByCategory,
    };
  }

  async getEscalationMetrics(filters: ReportFiltersDto) {
    const qb = this.escalationRepository.createQueryBuilder("e");

    if (filters.startDate && filters.endDate) {
      qb.andWhere("e.createdAt BETWEEN :start AND :end", {
        start: filters.startDate,
        end: filters.endDate,
      });
    }

    const total = await qb.getCount();

    const byReason = await this.escalationRepository
      .createQueryBuilder("e")
      .select("e.escalationReason", "reason")
      .addSelect("COUNT(*)", "count")
      .where(
        filters.startDate && filters.endDate
          ? "e.createdAt BETWEEN :start AND :end"
          : "1=1",
        {
          start: filters.startDate,
          end: filters.endDate,
        },
      )
      .groupBy("e.escalationReason")
      .getRawMany();

    return {
      totalEscalations: total,
      byReason,
    };
  }

  async getTrendData(filters: ReportFiltersDto) {
    const periodGroup =
      filters.period === "daily"
        ? "TO_CHAR(c.\"createdAt\", 'YYYY-MM-DD')"
        : filters.period === "weekly"
          ? "TO_CHAR(c.\"createdAt\", 'IYYY-IW')"
          : filters.period === "yearly"
            ? "TO_CHAR(c.\"createdAt\", 'YYYY')"
            : "TO_CHAR(c.\"createdAt\", 'YYYY-MM')";

    const trends = await this.complaintRepository
      .createQueryBuilder("c")
      .select(periodGroup, "period")
      .addSelect("COUNT(*)", "count")
      .where(
        filters.startDate && filters.endDate
          ? "c.createdAt BETWEEN :start AND :end"
          : "1=1",
        {
          start: filters.startDate,
          end: filters.endDate,
        },
      )
      .groupBy("period")
      .orderBy("period", "ASC")
      .getRawMany();

    return { trends };
  }
}
