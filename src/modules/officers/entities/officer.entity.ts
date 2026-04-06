import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { AuditableEntity } from "@shared/base/base.entity";
import { PoliceStationEntity } from "@modules/police-stations/entities/police-station.entity";

@Entity("officers")
@Index(["badgeNumber"], { unique: true })
@Index(["stationId"])
@Index(["rank"])
export class OfficerEntity extends AuditableEntity {
  @Column({ name: "badge_number", type: "varchar", length: 30, unique: true })
  badgeNumber!: string;

  @Column({
    name: "service_number",
    type: "varchar",
    length: 30,
    nullable: true,
  })
  serviceNumber!: string | null;

  @Column({ name: "first_name", length: 100 })
  firstName!: string;

  @Column({ name: "last_name", length: 100 })
  lastName!: string;

  @Column({ type: "varchar", length: 50 })
  rank!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  unit!: string | null;

  @Column({ name: "station_id", type: "uuid", nullable: true })
  stationId!: string | null;

  @ManyToOne(() => PoliceStationEntity, { nullable: true })
  @JoinColumn({ name: "station_id" })
  station!: PoliceStationEntity | null;

  @Column({ name: "is_active", default: true })
  isActive!: boolean;

  @Column({ name: "joined_date", type: "date", nullable: true })
  joinedDate!: Date | null;

  @Column({ name: "complaint_count", type: "int", default: 0 })
  complaintCount!: number;

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, unknown> | null;
}

@Entity("complaint_officers")
@Index(["complaintId", "officerId"], { unique: true })
export class ComplaintOfficerEntity {
  @Column({ type: "uuid", primary: true, generated: "uuid" })
  id!: string;

  @Column({ name: "complaint_id", type: "uuid" })
  complaintId!: string;

  @Column({ name: "officer_id", type: "uuid" })
  officerId!: string;

  @Column({ type: "varchar", length: 50, default: "accused" })
  role!: string;

  @Column({
    name: "created_at",
    type: "timestamptz",
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt!: Date;
}
