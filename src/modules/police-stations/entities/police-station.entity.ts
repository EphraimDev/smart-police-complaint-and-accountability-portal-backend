import { Entity, Column, Index } from "typeorm";
import { AuditableEntity } from "@shared/base/base.entity";

@Entity("police_stations")
@Index(["code"], { unique: true })
@Index(["regionId"])
export class PoliceStationEntity extends AuditableEntity {
  @Column({ type: "varchar", length: 20, unique: true })
  code!: string;

  @Column({ type: "varchar", length: 200 })
  name!: string;

  @Column({ type: "text", nullable: true })
  address!: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  region!: string | null;

  @Column({ name: "region_id", type: "uuid", nullable: true })
  regionId!: string | null;

  @Column({ name: "parent_station_id", type: "uuid", nullable: true })
  parentStationId!: string | null;

  @Column({ name: "commanding_officer_id", type: "uuid", nullable: true })
  commandingOfficerId!: string | null;

  @Column({ type: "varchar", length: 30, nullable: true })
  phone!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  email!: string | null;

  @Column({ name: "is_active", default: true })
  isActive!: boolean;

  @Column({ name: "complaint_count", type: "int", default: 0 })
  complaintCount!: number;

  @Column({ type: "jsonb", nullable: true })
  coordinates!: { lat: number; lng: number } | null;
}
