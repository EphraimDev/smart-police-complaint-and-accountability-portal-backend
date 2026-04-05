import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  HealthCheckResult,
} from "@nestjs/terminus";
import { Public } from "@common/decorators";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: "Liveness check" })
  check(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  @Get("ready")
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: "Readiness check (database)" })
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([() => this.db.pingCheck("database")]);
  }
}
