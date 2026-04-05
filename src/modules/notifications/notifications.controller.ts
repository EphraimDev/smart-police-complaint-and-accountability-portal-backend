import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { PermissionsGuard } from "@common/guards/permissions.guard";
import { RequirePermissions } from "@common/decorators";
import { Permission } from "@common/enums";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get("recipient/:recipientId")
  @RequirePermissions(Permission.NOTIFICATION_MANAGE)
  @ApiOperation({ summary: "Get notifications for a recipient" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  findByRecipient(
    @Param("recipientId", ParseUUIDPipe) recipientId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
  ) {
    return this.notificationsService.findByRecipient(recipientId, page, limit);
  }

  @Get("dead-letter")
  @RequirePermissions(Permission.ADMIN_CONFIG)
  @ApiOperation({ summary: "Get failed notifications (dead letter queue)" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  getDeadLetterQueue(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
  ) {
    return this.notificationsService.getDeadLetterQueue(page, limit);
  }
}
