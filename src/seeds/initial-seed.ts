import { DataSource } from "typeorm";
import * as argon2 from "argon2";
import { v4 as uuidv4 } from "uuid";
import { Permission } from "@common/enums";

/**
 * Seeds initial roles, permissions, role-permission mappings, and an admin user.
 * Run via: npx ts-node -r tsconfig-paths/register src/seeds/initial-seed.ts
 */
async function seed() {
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

  // Use the same TypeORM config as the CLI
  const { default: dataSource } = await import("../config/typeorm.config");
  const ds: DataSource = dataSource;

  if (!ds.isInitialized) {
    await ds.initialize();
  }

  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // ── Permissions ──────────────────────────────────────────────────
    const permissions = Object.values(Permission);

    for (const perm of permissions) {
      const id = uuidv4();
      await queryRunner.query(
        `INSERT INTO permissions (id, name, description, module)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name) DO UPDATE
         SET description = EXCLUDED.description,
             module = EXCLUDED.module`,
        [
          id,
          perm,
          perm.replace(/[:_]/g, " "),
          getPermissionModule(perm),
        ],
      );
    }

    // ── Roles ────────────────────────────────────────────────────────
    const roles: Record<string, { id: string; permissions: string[] }> = {
      SUPER_ADMIN: {
        id: uuidv4(),
        permissions: permissions, // all permissions
      },
      ADMIN: {
        id: uuidv4(),
        permissions: permissions,
      },
      POLICE_ADMIN: {
        id: uuidv4(),
        permissions: [
          Permission.COMPLAINT_READ,
          Permission.COMPLAINT_UPDATE,
          Permission.COMPLAINT_ASSIGN,
          Permission.EVIDENCE_UPLOAD,
          Permission.EVIDENCE_READ,
          Permission.OFFICER_CREATE,
          Permission.OFFICER_READ,
          Permission.OFFICER_UPDATE,
          Permission.STATION_CREATE,
          Permission.STATION_READ,
          Permission.STATION_UPDATE,
          Permission.REPORT_VIEW,
          Permission.ADMIN_DASHBOARD,
        ],
      },
      INVESTIGATOR: {
        id: uuidv4(),
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
      OVERSIGHT_BODY: {
        id: uuidv4(),
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
      COMPLAINANT: {
        id: uuidv4(),
        permissions: [
          Permission.COMPLAINT_CREATE,
          Permission.COMPLAINT_READ_OWN,
          Permission.EVIDENCE_UPLOAD,
        ],
      },
      PUBLIC: {
        id: uuidv4(),
        permissions: [],
      },
    };

    for (const [roleName, roleData] of Object.entries(roles)) {
      await queryRunner.query(
      `INSERT INTO roles (id, name, description, is_system)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (name) DO NOTHING`,
        [roleData.id, roleName, `${roleName.replace(/_/g, " ")} role`],
      );

      // Fetch actual permission IDs (in case ON CONFLICT didn't insert, we need real IDs)
      for (const permName of roleData.permissions) {
        const permRow = await queryRunner.query(
          `SELECT id FROM permissions WHERE name = $1`,
          [permName],
        );
        if (permRow.length > 0) {
          const roleRow = await queryRunner.query(
            `SELECT id FROM roles WHERE name = $1`,
            [roleName],
          );
          if (roleRow.length > 0) {
            await queryRunner.query(
              `INSERT INTO role_permissions (role_id, permission_id)
               VALUES ($1, $2)
               ON CONFLICT DO NOTHING`,
              [roleRow[0].id, permRow[0].id],
            );
          }
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

    // ── Admin User ───────────────────────────────────────────────────
    const adminPassword = await argon2.hash("Admin@123456");
    const adminId = uuidv4();

    await queryRunner.query(
      `INSERT INTO users (id, email, "passwordHash", "firstName", "lastName", is_active, is_email_verified, failed_login_attempts)
       VALUES ($1, $2, $3, $4, $5, true, true, 0)
       ON CONFLICT (email) DO NOTHING`,
      [adminId, "admin@spcap.gov", adminPassword, "System", "Administrator"],
    );

    // Assign SUPER_ADMIN role
    const adminRow = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`,
      ["admin@spcap.gov"],
    );
    const superAdminRole = await queryRunner.query(
      `SELECT id FROM roles WHERE name = $1`,
      ["SUPER_ADMIN"],
    );
    if (adminRow.length > 0 && superAdminRole.length > 0) {
      await queryRunner.query(
        `INSERT INTO user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [adminRow[0].id, superAdminRole[0].id],
      );
    }

    await queryRunner.commitTransaction();
    console.log("✅ Seed completed successfully");
    console.log("   Admin email: admin@spcap.gov");
    console.log("   Admin password: Admin@123456");
    console.log("   ⚠️  Change this password immediately in production!");
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error("❌ Seed failed:", (error as Error).message);
    throw error;
  } finally {
    await queryRunner.release();
    await ds.destroy();
  }
}

seed().catch(() => process.exit(1));
