import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  VersionColumn,
} from "typeorm";

export abstract class BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

export abstract class AuditableEntity extends BaseEntity {
  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdBy!: string | null;

  @Column({ name: "updated_by", type: "uuid", nullable: true })
  updatedBy!: string | null;
}

export abstract class SoftDeletableEntity extends AuditableEntity {
  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt!: Date | null;
}

export abstract class VersionedEntity extends AuditableEntity {
  @VersionColumn()
  version!: number;
}
