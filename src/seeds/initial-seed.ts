import { DataSource } from "typeorm";
import * as argon2 from "argon2";
import { v4 as uuidv4 } from "uuid";
import { Permission, UserRole } from "@common/enums";

/**
 * Seeds initial roles, permissions, role-permission mappings, and demo users.
 * Run via: npx ts-node -r tsconfig-paths/register src/seeds/initial-seed.ts
 */
async function seed() {
  const seedPassword = "Admin@123456";
  const legacyPermissions = [
    "CREATE_COMPLAINT",
    "VIEW_COMPLAINT",
    "VIEW_OWN_COMPLAINTS",
    "UPDATE_COMPLAINT",
    "DELETE_COMPLAINT",
    "ASSIGN_COMPLAINT",
    "REASSIGN_COMPLAINT",
    "UPDATE_COMPLAINT_STATUS",
    "ADD_COMPLAINT_NOTE",
    "VIEW_COMPLAINT_TIMELINE",
    "UPLOAD_EVIDENCE",
    "VIEW_EVIDENCE",
    "DELETE_EVIDENCE",
    "VERIFY_EVIDENCE",
    "CREATE_OFFICER",
    "VIEW_OFFICER",
    "UPDATE_OFFICER",
    "DELETE_OFFICER",
    "CREATE_STATION",
    "VIEW_STATION",
    "UPDATE_STATION",
    "DELETE_STATION",
    "CREATE_USER",
    "VIEW_USER",
    "UPDATE_USER",
    "DELETE_USER",
    "ASSIGN_ROLES",
    "CREATE_ROLE",
    "VIEW_ROLE",
    "UPDATE_ROLE",
    "DELETE_ROLE",
    "ASSIGN_PERMISSIONS",
    "ESCALATE_COMPLAINT",
    "REVIEW_ESCALATION",
    "VIEW_ESCALATIONS",
    "REQUEST_AI_ANALYSIS",
    "VIEW_AI_RESULTS",
    "REVIEW_AI_RESULTS",
    "VIEW_REPORTS",
    "GENERATE_REPORTS",
    "VIEW_DASHBOARD",
    "MANAGE_SYSTEM",
    "VIEW_AUDIT_LOGS",
    "VIEW_NOTIFICATIONS",
    "MANAGE_NOTIFICATIONS",
  ];

  const getPermissionModule = (permission: string): string => {
    if (permission.startsWith("complaint:")) return "complaints";
    if (permission.startsWith("evidence:")) return "evidence";
    if (permission.startsWith("officer:")) return "officers";
    if (permission.startsWith("station:")) return "stations";
    if (permission.startsWith("user:")) return "users";
    if (permission.startsWith("role:")) return "access_control";
    if (permission.startsWith("oversight:")) return "oversight";
    if (permission.startsWith("ai:")) return "ai";
    if (permission.startsWith("report:")) return "reports";
    if (permission.startsWith("audit:") || permission.startsWith("admin:")) {
      return "admin";
    }
    if (permission.startsWith("notification:")) return "notifications";
    return "system";
  };

  const roleDefinitions: Record<
    UserRole,
    { description: string; permissions: Permission[] }
  > = {
    [UserRole.ADMIN]: {
      description: "System administrator role",
      permissions: Object.values(Permission),
    },
    [UserRole.CITIZEN]: {
      description: "Citizen role",
      permissions: [
        Permission.COMPLAINT_CREATE,
        Permission.COMPLAINT_READ_OWN,
        Permission.EVIDENCE_UPLOAD,
      ],
    },
    [UserRole.COMPLAINT_DESK_OFFICER]: {
      description: "Complaint desk officer role",
      permissions: [
        Permission.COMPLAINT_READ,
        Permission.COMPLAINT_UPDATE,
        Permission.COMPLAINT_ASSIGN,
        Permission.EVIDENCE_READ,
        Permission.OFFICER_READ,
        Permission.STATION_READ,
        Permission.USER_READ,
        Permission.ADMIN_DASHBOARD,
      ],
    },
    [UserRole.INVESTIGATOR]: {
      description: "Investigator role",
      permissions: [
        Permission.COMPLAINT_READ,
        Permission.COMPLAINT_UPDATE,
        Permission.EVIDENCE_UPLOAD,
        Permission.EVIDENCE_READ,
        Permission.OFFICER_READ,
        Permission.STATION_READ,
        Permission.AI_REQUEST_ANALYSIS,
        Permission.AI_VIEW_RESULTS,
      ],
    },
    [UserRole.SUPERVISOR]: {
      description: "Supervisor role",
      permissions: [
        Permission.COMPLAINT_READ,
        Permission.COMPLAINT_UPDATE,
        Permission.COMPLAINT_ASSIGN,
        Permission.COMPLAINT_ESCALATE,
        Permission.COMPLAINT_CLOSE,
        Permission.EVIDENCE_READ,
        Permission.OFFICER_READ,
        Permission.STATION_READ,
        Permission.USER_READ,
        Permission.REPORT_VIEW,
        Permission.REPORT_EXPORT,
        Permission.ADMIN_DASHBOARD,
        Permission.AUDIT_READ,
      ],
    },
    [UserRole.INTERNAL_AFFAIRS_OFFICER]: {
      description: "Internal affairs officer role",
      permissions: [
        Permission.COMPLAINT_READ,
        Permission.COMPLAINT_UPDATE,
        Permission.COMPLAINT_ESCALATE,
        Permission.EVIDENCE_READ,
        Permission.OFFICER_READ,
        Permission.OFFICER_UPDATE,
        Permission.STATION_READ,
        Permission.AI_VIEW_RESULTS,
        Permission.REPORT_VIEW,
        Permission.AUDIT_READ,
      ],
    },
    [UserRole.OVERSIGHT_OFFICER]: {
      description: "Oversight officer role",
      permissions: [
        Permission.COMPLAINT_READ,
        Permission.EVIDENCE_READ,
        Permission.OFFICER_READ,
        Permission.STATION_READ,
        Permission.COMPLAINT_ESCALATE,
        Permission.OVERSIGHT_VIEW,
        Permission.OVERSIGHT_ACTION,
        Permission.AI_VIEW_RESULTS,
        Permission.AI_REVIEW,
        Permission.REPORT_VIEW,
        Permission.REPORT_EXPORT,
        Permission.ADMIN_DASHBOARD,
        Permission.AUDIT_READ,
      ],
    },
  };

  const seededUsers: Array<{
    role: UserRole;
    firstName: string;
    lastName: string;
    email: string;
  }> = [
    {
      role: UserRole.ADMIN,
      firstName: "System",
      lastName: "Administrator",
      email: "admin@spcap.gov",
    },
    {
      role: UserRole.CITIZEN,
      firstName: "Demo",
      lastName: "Citizen",
      email: "citizen@spcap.gov",
    },
    {
      role: UserRole.COMPLAINT_DESK_OFFICER,
      firstName: "Complaint",
      lastName: "Desk",
      email: "complaint.desk@spcap.gov",
    },
    {
      role: UserRole.INVESTIGATOR,
      firstName: "Case",
      lastName: "Investigator",
      email: "investigator@spcap.gov",
    },
    {
      role: UserRole.SUPERVISOR,
      firstName: "Duty",
      lastName: "Supervisor",
      email: "supervisor@spcap.gov",
    },
    {
      role: UserRole.INTERNAL_AFFAIRS_OFFICER,
      firstName: "Internal",
      lastName: "Affairs",
      email: "internal.affairs@spcap.gov",
    },
    {
      role: UserRole.OVERSIGHT_OFFICER,
      firstName: "Oversight",
      lastName: "Officer",
      email: "oversight.officer@spcap.gov",
    },
  ];

  const { default: dataSource } = await import("../config/typeorm.config");
  const ds: DataSource = dataSource;

  if (!ds.isInitialized) {
    await ds.initialize();
  }

  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const permissions = Object.values(Permission);

    for (const perm of permissions) {
      await queryRunner.query(
        `INSERT INTO permissions (id, name, description, module)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name) DO UPDATE
         SET description = EXCLUDED.description,
             module = EXCLUDED.module`,
        [
          uuidv4(),
          perm,
          perm.replace(/[:_]/g, " "),
          getPermissionModule(perm),
        ],
      );
    }

    for (const [roleName, roleData] of Object.entries(roleDefinitions)) {
      await queryRunner.query(
        `INSERT INTO roles (id, name, description, is_system)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (name) DO UPDATE
         SET description = EXCLUDED.description,
             is_system = EXCLUDED.is_system`,
        [uuidv4(), roleName, roleData.description],
      );

      for (const permName of roleData.permissions) {
        const permRow = await queryRunner.query(
          `SELECT id FROM permissions WHERE name = $1`,
          [permName],
        );
        const roleRow = await queryRunner.query(
          `SELECT id FROM roles WHERE name = $1`,
          [roleName],
        );

        if (permRow.length > 0 && roleRow.length > 0) {
          await queryRunner.query(
            `INSERT INTO role_permissions (role_id, permission_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [roleRow[0].id, permRow[0].id],
          );
        }
      }
    }

    await queryRunner.query(
      `DELETE FROM role_permissions rp
       USING permissions p
       WHERE rp.permission_id = p.id
         AND p.name = ANY($1)`,
      [legacyPermissions],
    );

    await queryRunner.query(
      `DELETE FROM permissions
       WHERE name = ANY($1)`,
      [legacyPermissions],
    );

    const passwordHash = await argon2.hash(seedPassword);

    for (const user of seededUsers) {
      await queryRunner.query(
        `INSERT INTO users (id, email, "passwordHash", "firstName", "lastName", is_active, is_email_verified, failed_login_attempts)
         VALUES ($1, $2, $3, $4, $5, true, true, 0)
         ON CONFLICT (email) DO UPDATE
         SET "passwordHash" = EXCLUDED."passwordHash",
             "firstName" = EXCLUDED."firstName",
             "lastName" = EXCLUDED."lastName",
             is_active = EXCLUDED.is_active,
             is_email_verified = EXCLUDED.is_email_verified,
             failed_login_attempts = EXCLUDED.failed_login_attempts`,
        [
          uuidv4(),
          user.email,
          passwordHash,
          user.firstName,
          user.lastName,
        ],
      );

      const userRow = await queryRunner.query(
        `SELECT id FROM users WHERE email = $1`,
        [user.email],
      );
      const roleRow = await queryRunner.query(
        `SELECT id FROM roles WHERE name = $1`,
        [user.role],
      );

      if (userRow.length > 0 && roleRow.length > 0) {
        await queryRunner.query(
          `INSERT INTO user_roles (user_id, role_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [userRow[0].id, roleRow[0].id],
        );
      }
    }

    await queryRunner.commitTransaction();
    console.log("Seed completed successfully");
    console.log("Seeded users:");
    for (const user of seededUsers) {
      console.log(`- ${user.role}: ${user.email} / ${seedPassword}`);
    }
    console.log("Change these passwords immediately in production!");
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error("Seed failed:", (error as Error).message);
    throw error;
  } finally {
    await queryRunner.release();
    await ds.destroy();
  }
}

seed().catch(() => process.exit(1));
