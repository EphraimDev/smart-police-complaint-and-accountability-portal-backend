import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { INestApplication } from "@nestjs/common";

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle("Smart Police Complaint and Accountability Portal")
    .setDescription(
      "A secure, auditable complaint management platform for handling citizen complaints against police officers, stations, units, or policing activities.",
    )
    .setVersion("1.0.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter JWT access token",
      },
      "access-token",
    )
    .addTag("Auth", "Authentication and authorization")
    .addTag("Users", "User management")
    .addTag("Roles", "Role management")
    .addTag("Permissions", "Permission management")
    .addTag("Complaints", "Complaint management")
    .addTag("Complaint Assignments", "Complaint assignment management")
    .addTag("Complaint Status History", "Complaint status tracking")
    .addTag("Evidence", "Evidence management")
    .addTag("Officers", "Officer records")
    .addTag("Police Stations", "Police station records")
    .addTag("Oversight", "Oversight and escalation management")
    .addTag("Notifications", "Notification management")
    .addTag("Audit Logs", "Audit trail")
    .addTag("AI", "AI-assisted analysis (advisory only)")
    .addTag("Reports", "Reporting and analytics")
    .addTag("Admin", "Administration")
    .addTag("Health", "Health checks")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
