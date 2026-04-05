import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { APP_CONSTANTS } from "@common/constants";

export class LoginDto {
  @ApiProperty({ example: "admin@example.com" })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: "SecurePassword123!" })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({
    description: "Device information for session tracking",
  })
  @IsOptional()
  @IsString()
  deviceInfo?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class LogoutDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ minLength: APP_CONSTANTS.MIN_PASSWORD_LENGTH })
  @IsString()
  @MinLength(APP_CONSTANTS.MIN_PASSWORD_LENGTH)
  newPassword!: string;
}

export class TokenResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty()
  expiresIn!: string;

  @ApiProperty()
  tokenType!: string;
}

export class AuthResponseDto {
  @ApiProperty()
  user!: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
  };

  @ApiProperty()
  tokens!: TokenResponseDto;
}
