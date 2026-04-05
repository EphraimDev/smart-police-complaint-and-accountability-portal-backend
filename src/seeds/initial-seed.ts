import { DataSource } from "typeorm";
import * as argon2 from "argon2";
import { v4 as uuidv4 } from "uuid";

/**
 * Seeds initial roles, permissions, role-permission mappings, and an admin user.
 * Run via: npx ts-node -r tsconfig-paths/register src/seeds/initial-seed.ts
 */
async function seed() {
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
    const permissions = [
      // Complaints
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
      // Evidence
      "UPLOAD_EVIDENCE",
      "VIEW_EVIDENCE",
      "DELETE_EVIDENCE",
      "VERIFY_EVIDENCE",
      // Officers
      "CREATE_OFFICER",
      "VIEW_OFFICER",
      "UPDATE_OFFICER",
      "DELETE_OFFICER",
      // Stations
      "CREATE_STATION",
      "VIEW_STATION",
      "UPDATE_STATION",
      "DELETE_STATION",
      // Users
      "CREATE_USER",
      "VIEW_USER",
      "UPDATE_USER",
      "DELETE_USER",
      "ASSIGN_ROLES",
      // Roles
      "CREATE_ROLE",
      "VIEW_ROLE",
      "UPDATE_ROLE",
      "DELETE_ROLE",
      "ASSIGN_PERMISSIONS",
      // Oversight
      "ESCALATE_COMPLAINT",
      "REVIEW_ESCALATION",
      "VIEW_ESCALATIONS",
      // AI
      "REQUEST_AI_ANALYSIS",
      "VIEW_AI_RESULTS",
      "REVIEW_AI_RESULTS",
      // Reports
      "VIEW_REPORTS",
      "GENERATE_REPORTS",
      // Admin
      "VIEW_DASHBOARD",
      "MANAGE_SYSTEM",
      "VIEW_AUDIT_LOGS",
      // Notifications
      "VIEW_NOTIFICATIONS",
      "MANAGE_NOTIFICATIONS",
    ];

    const permissionIds: Record<string, string> = {};
    for (const perm of permissions) {
      const id = uuidv4();
      permissionIds[perm] = id;
      await queryRunner.query(
        `INSERT INTO permissions (id, name, description, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (name) DO NOTHING`,
        [id, perm, perm.replace(/_/g, " ").toLowerCase()],
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
        permissions: permissions.filter((p) => p !== "MANAGE_SYSTEM"),
      },
      POLICE_ADMIN: {
        id: uuidv4(),
        permissions: [
          "VIEW_COMPLAINT",
          "UPDATE_COMPLAINT",
          "ASSIGN_COMPLAINT",
          "REASSIGN_COMPLAINT",
          "UPDATE_COMPLAINT_STATUS",
          "ADD_COMPLAINT_NOTE",
          "VIEW_COMPLAINT_TIMELINE",
          "UPLOAD_EVIDENCE",
          "VIEW_EVIDENCE",
          "CREATE_OFFICER",
          "VIEW_OFFICER",
          "UPDATE_OFFICER",
          "CREATE_STATION",
          "VIEW_STATION",
          "UPDATE_STATION",
          "VIEW_REPORTS",
          "VIEW_DASHBOARD",
        ],
      },
      INVESTIGATOR: {
        id: uuidv4(),
        permissions: [
          "VIEW_COMPLAINT",
          "UPDATE_COMPLAINT",
          "UPDATE_COMPLAINT_STATUS",
          "ADD_COMPLAINT_NOTE",
          "VIEW_COMPLAINT_TIMELINE",
          "UPLOAD_EVIDENCE",
          "VIEW_EVIDENCE",
          "VERIFY_EVIDENCE",
          "VIEW_OFFICER",
          "VIEW_STATION",
          "REQUEST_AI_ANALYSIS",
          "VIEW_AI_RESULTS",
        ],
      },
      OVERSIGHT_BODY: {
        id: uuidv4(),
        permissions: [
          "VIEW_COMPLAINT",
          "VIEW_COMPLAINT_TIMELINE",
          "VIEW_EVIDENCE",
          "VIEW_OFFICER",
          "VIEW_STATION",
          "ESCALATE_COMPLAINT",
          "REVIEW_ESCALATION",
          "VIEW_ESCALATIONS",
          "VIEW_AI_RESULTS",
          "REVIEW_AI_RESULTS",
          "VIEW_REPORTS",
          "GENERATE_REPORTS",
          "VIEW_DASHBOARD",
          "VIEW_AUDIT_LOGS",
        ],
      },
      COMPLAINANT: {
        id: uuidv4(),
        permissions: [
          "CREATE_COMPLAINT",
          "VIEW_OWN_COMPLAINTS",
          "UPLOAD_EVIDENCE",
          "VIEW_NOTIFICATIONS",
        ],
      },
      PUBLIC: {
        id: uuidv4(),
        permissions: [],
      },
    };

    for (const [roleName, roleData] of Object.entries(roles)) {
      await queryRunner.query(
        `INSERT INTO roles (id, name, description, "isSystem", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, true, NOW(), NOW())
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
              `INSERT INTO role_permissions ("rolesId", "permissionsId")
               VALUES ($1, $2)
               ON CONFLICT DO NOTHING`,
              [roleRow[0].id, permRow[0].id],
            );
          }
        }
      }
    }

    // ── Admin User ───────────────────────────────────────────────────
    const adminPassword = await argon2.hash("Admin@123456");
    const adminId = uuidv4();

    await queryRunner.query(
      `INSERT INTO users (id, email, "passwordHash", "firstName", "lastName", "isActive", "isEmailVerified", "failedLoginAttempts", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, true, true, 0, NOW(), NOW())
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
        `INSERT INTO user_roles ("usersId", "rolesId")
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
