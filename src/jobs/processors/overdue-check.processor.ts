import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan, Not, In } from "typeorm";
import { QUEUE_NAMES } from "@common/constants";
import { ComplaintEntity } from "@modules/complaints/entities/complaint.entity";
import { ComplaintStatus } from "@common/enums";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

@Processor(QUEUE_NAMES.OVERDUE_CHECK)
export class OverdueCheckProcessor extends WorkerHost {
  private readonly logger = new Logger(OverdueCheckProcessor.name);

  constructor(
    @InjectRepository(ComplaintEntity)
    private readonly complaintRepository: Repository<ComplaintEntity>,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationQueue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing overdue check job ${job.id}`);

    const terminalStatuses = [
      ComplaintStatus.RESOLVED,
      ComplaintStatus.CLOSED,
      ComplaintStatus.WITHDRAWN,
    ];

    const overdueComplaints = await this.complaintRepository.find({
      where: {
        slaDueDate: LessThan(new Date()),
        status: Not(In(terminalStatuses)),
      },
      relations: ["complainant"],
    });

    this.logger.log(`Found ${overdueComplaints.length} overdue complaints`);

    for (const complaint of overdueComplaints) {
      await this.notificationQueue.add("overdue-notification", {
        recipientId: complaint.citizenUserId,
        type: "sla_breach",
        subject: `Complaint ${complaint.referenceNumber} is overdue`,
        body: `Your complaint ${complaint.referenceNumber} has exceeded its SLA due date.`,
        referenceType: "complaint",
        referenceId: complaint.id,
      });
    }
  }
}
