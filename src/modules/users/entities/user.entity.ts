import {
  Entity,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
  Index,
} from "typeorm";
import { SoftDeletableEntity } from "@shared/base/base.entity";
import { UserRole } from "@common/enums";

@Entity("users")
@Index(["email"], { unique: true })
export class UserEntity extends SoftDeletableEntity {
  @Column({ length: 100 })
  firstName!: string;

  @Column({ length: 100 })
  lastName!: string;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ select: false })
  passwordHash!: string;

  @Column({ name: "phone_encrypted", type: "text", nullable: true })
  phoneEncrypted!: string | null;

  @Column({ name: "is_active", default: true })
  isActive!: boolean;

  @Column({ name: "is_email_verified", default: false })
  isEmailVerified!: boolean;

  @Column({ name: "failed_login_attempts", default: 0 })
  failedLoginAttempts!: number;

  @Column({ name: "locked_until", type: "timestamptz", nullable: true })
  lockedUntil!: Date | null;

  @Column({ name: "last_login_at", type: "timestamptz", nullable: true })
  lastLoginAt!: Date | null;

  @Column({
    name: "last_login_ip",
    type: "varchar",
    length: 45,
    nullable: true,
  })
  lastLoginIp!: string | null;

  @Column({ name: "totp_secret", type: "text", nullable: true, select: false })
  totpSecret!: string | null;

  @Column({ name: "is_two_factor_enabled", default: false })
  isTwoFactorEnabled!: boolean;

  @ManyToMany(() => RoleEntity, (role) => role.users, { eager: false })
  @JoinTable({
    name: "user_roles",
    joinColumn: { name: "user_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "role_id", referencedColumnName: "id" },
  })
  roles!: RoleEntity[];
}

@Entity("roles")
@Index(["name"], { unique: true })
export class RoleEntity {
  @Column({ type: "uuid", primary: true, generated: "uuid" })
  id!: string;

  @Column({ unique: true, length: 50 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ name: "is_system", default: false })
  isSystem!: boolean;

  @ManyToMany(() => PermissionEntity, (permission) => permission.roles, {
    eager: false,
  })
  @JoinTable({
    name: "role_permissions",
    joinColumn: { name: "role_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "permission_id", referencedColumnName: "id" },
  })
  permissions!: PermissionEntity[];

  @ManyToMany(() => UserEntity, (user) => user.roles)
  users!: UserEntity[];

  @Column({
    name: "created_at",
    type: "timestamptz",
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt!: Date;

  @Column({
    name: "updated_at",
    type: "timestamptz",
    default: () => "CURRENT_TIMESTAMP",
  })
  updatedAt!: Date;
}

@Entity("permissions")
@Index(["name"], { unique: true })
export class PermissionEntity {
  @Column({ type: "uuid", primary: true, generated: "uuid" })
  id!: string;

  @Column({ unique: true, length: 100 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ length: 50 })
  module!: string;

  @ManyToMany(() => RoleEntity, (role) => role.permissions)
  roles!: RoleEntity[];

  @Column({
    name: "created_at",
    type: "timestamptz",
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt!: Date;
}

@Entity("refresh_tokens")
@Index(["userId"])
@Index(["tokenHash"], { unique: true })
@Index(["expiresAt"])
export class RefreshTokenEntity {
  @Column({ type: "uuid", primary: true, generated: "uuid" })
  id!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ name: "token_hash", type: "varchar", length: 128 })
  tokenHash!: string;

  @Column({ name: "device_info", type: "jsonb", nullable: true })
  deviceInfo!: Record<string, unknown> | null;

  @Column({ name: "ip_address", type: "varchar", length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ name: "session_id", type: "uuid" })
  sessionId!: string;

  @Column({ name: "is_revoked", default: false })
  isRevoked!: boolean;

  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  revokedAt!: Date | null;

  @Column({
    name: "revoked_reason",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  revokedReason!: string | null;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({
    name: "created_at",
    type: "timestamptz",
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt!: Date;
}
