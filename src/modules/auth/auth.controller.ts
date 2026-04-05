import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Headers,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { AuthService } from "./auth.service";
import {
  LoginDto,
  RefreshTokenDto,
  LogoutDto,
  ChangePasswordDto,
} from "./dto/auth.dto";
import { Public, CurrentUser } from "@common/decorators";
import { RequestUser } from "@common/interfaces";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "User login" })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Headers("user-agent") userAgent: string,
  ) {
    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown";
    return this.authService.login(dto, ipAddress, userAgent || "unknown");
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token" })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Headers("user-agent") userAgent: string,
  ) {
    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown";
    return this.authService.refreshTokens(
      dto,
      ipAddress,
      userAgent || "unknown",
    );
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "User logout" })
  async logout(
    @Body() dto: LogoutDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
    @Headers("user-agent") userAgent: string,
  ) {
    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown";
    await this.authService.logout(
      user.id,
      dto.refreshToken,
      ipAddress,
      userAgent || "unknown",
    );
    return { message: "Logged out successfully" };
  }

  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Change password" })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
    @Headers("user-agent") userAgent: string,
  ) {
    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown";
    await this.authService.changePassword(
      user.id,
      dto,
      ipAddress,
      userAgent || "unknown",
    );
    return { message: "Password changed successfully" };
  }
}
