# Smart Police Complaint and Accountability Portal — Backend API

A production-grade NestJS backend for managing citizen complaints against police officers, stations, units, or policing activities. Features RBAC, field-level encryption, audit logging, AI-assisted analysis, BullMQ job queues, and Swagger documentation.

## Architecture

```
src/
├── common/            # Enums, constants, decorators, guards, filters, interceptors, pipes, utils
├── config/            # ConfigModule factories (app, auth, database, redis, queue, swagger)
├── integrations/      # Provider interfaces + mock implementations (AI, Email, SMS, Storage)
├── jobs/              # BullMQ processors (notifications, AI analysis, overdue checks)
├── migrations/        # TypeORM migrations
├── modules/
│   ├── admin/         # Admin dashboard
│   ├── ai/            # AI-assisted complaint analysis
│   ├── audit-logs/    # Immutable audit trail
│   ├── auth/          # JWT authentication with refresh token rotation
│   ├── complaint-assignments/
│   ├── complaint-status-history/
│   ├── complaints/    # Core complaint CRUD + status workflow
│   ├── evidence/      # Evidence upload with chain of custody
│   ├── health/        # Terminus health checks
│   ├── notifications/ # Multi-channel notifications
│   ├── officers/      # Officer management
│   ├── oversight/     # Civilian oversight escalations
│   ├── permissions/   # Permission definitions
│   ├── police-stations/
│   ├── reports/       # Analytics & reporting
│   ├── roles/         # Role management with permission assignment
│   └── users/         # User management
├── seeds/             # Initial data seed (roles, permissions, admin user)
├── shared/            # Base entities, encryption, pagination, transaction helper
├── app.module.ts      # Root application module
└── main.ts            # Bootstrap
```

## Tech Stack

| Layer                 | Technology                                     |
| --------------------- | ---------------------------------------------- |
| Framework             | NestJS 10.4 / TypeScript 5.5                   |
| Database              | PostgreSQL 16 via TypeORM 0.3                  |
| Cache / Queue backend | Redis 7 via ioredis 5.4                        |
| Job Queue             | BullMQ 5.12                                    |
| Auth                  | jose 5.6 (JWT HS256), Argon2 password hashing  |
| Encryption            | AES-256-GCM field-level encryption             |
| Validation            | class-validator / class-transformer, Joi (env) |
| Security              | Helmet, CORS, rate-limit ready                 |
| Docs                  | Swagger / OpenAPI 3                            |
| Health                | @nestjs/terminus                               |
| Logging               | Winston with daily rotate                      |
| Docker                | Multi-stage build, compose with health checks  |
| Testing               | Jest / ts-jest, supertest (e2e)                |

## Prerequisites

- Node.js >= 20
- PostgreSQL >= 15
- Redis >= 7
- Docker & Docker Compose (optional)

## Quick Start

### 1. Clone & install

```bash
git clone <repo-url>
cd smart-police-complaint-and-accountability-portal-backend
npm install
```

### 2. Environment

```bash
cp .env.example .env
# Edit .env with your database, Redis, and JWT settings
```

### 3. Database

```bash
# Generate a migration from current entities
npm run migration:generate -- src/migrations/Init

# Sample migration generate command
npm run migration:generate -- src/migrations/ProjectSetup

# Run migrations
npm run migration:run

# Seed initial data (roles, permissions, admin user)
npm run seed
```

### 4. Run

```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod
```

### 5. Docker

```bash
docker-compose up -d
```

API available at `http://localhost:3000/api/v1`.
Swagger UI at `http://localhost:3000/api/docs`.

## Authentication

All endpoints (except `/health` and `/auth/login`) require a Bearer token.

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@spcap.gov", "password": "Admin@123456"}'
```

**Default admin credentials** (change immediately):

- Email: `admin@spcap.gov`
- Password: `Admin@123456`

## Security Features

- **JWT with refresh token rotation** — short-lived access tokens, refresh token family tracking, reuse detection revokes entire family
- **Argon2 password hashing** — memory-hard, resistant to GPU attacks
- **AES-256-GCM field-level encryption** — PII (phone, email, address, national ID) encrypted at rest
- **Account lockout** — configurable failed-attempt threshold and lockout duration
- **Immutable audit logs** — every state change logged with actor, IP, user agent, before/after state
- **RBAC** — 7 roles, 40+ granular permissions, enforced globally via guards
- **Correlation IDs** — every request gets a traceable UUID
- **Helmet** — security headers
- **Input validation** — whitelist-based DTO validation, forbidNonWhitelisted
- **Parameterized queries** — TypeORM prevents SQL injection
- **Evidence chain of custody** — cryptographic file hashing, access logging

## Roles

| Role           | Description                                      |
| -------------- | ------------------------------------------------ |
| SUPER_ADMIN    | Full system access                               |
| ADMIN          | All except system management                     |
| POLICE_ADMIN   | Station/officer management, complaint assignment |
| INVESTIGATOR   | Investigation workflow, evidence, AI analysis    |
| OVERSIGHT_BODY | Escalation, review, reports, audit logs          |
| COMPLAINANT    | File complaints, upload evidence, view own       |
| PUBLIC         | Unauthenticated access (health, public tracking) |

## API Modules

| Module          | Base Path                   | Key Operations                                          |
| --------------- | --------------------------- | ------------------------------------------------------- |
| Auth            | `/auth`                     | login, refresh, logout, change-password                 |
| Users           | `/users`                    | CRUD, role assignment, activate/deactivate              |
| Roles           | `/roles`                    | CRUD, permission assignment                             |
| Permissions     | `/permissions`              | List all                                                |
| Complaints      | `/complaints`               | CRUD, status workflow, notes, timeline, public tracking |
| Assignments     | `/complaint-assignments`    | Assign, reassign, update status                         |
| Status History  | `/complaint-status-history` | Immutable timeline                                      |
| Evidence        | `/evidence`                 | Upload, chain of custody, integrity verification        |
| Officers        | `/officers`                 | CRUD, search                                            |
| Police Stations | `/police-stations`          | CRUD, region filter                                     |
| Oversight       | `/oversight`                | Escalate, review                                        |
| Notifications   | `/notifications`            | By recipient, dead-letter queue                         |
| AI              | `/ai/analyses`              | Request analysis, review results                        |
| Reports         | `/reports`                  | Summary, resolution, overdue, escalation, trends        |
| Admin           | `/admin`                    | Dashboard, system health                                |
| Health          | `/health`                   | Liveness, readiness                                     |

## Testing

```bash
# Unit tests
npm run test

# E2E tests (requires running DB + Redis)
npm run test:e2e

# Coverage
npm run test:cov
```

## Scripts

| Script                       | Description                      |
| ---------------------------- | -------------------------------- |
| `npm run build`              | Compile TypeScript               |
| `npm run start:dev`          | Development with hot reload      |
| `npm run start:prod`         | Production mode                  |
| `npm run migration:generate` | Generate migration from entities |
| `npm run migration:run`      | Apply pending migrations         |
| `npm run migration:revert`   | Revert last migration            |
| `npm run seed`               | Seed initial data                |
| `npm run test`               | Run unit tests                   |
| `npm run test:e2e`           | Run end-to-end tests             |
| `npm run test:cov`           | Test coverage report             |
| `npm run lint`               | Lint check                       |

## License

MIT
