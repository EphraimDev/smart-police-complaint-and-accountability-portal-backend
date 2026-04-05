import { Permission, UserRole } from "@common/enums";

export interface JwtPayload {
  sub: string;
  email: string;
  roles: UserRole[];
  permissions: Permission[];
  sessionId: string;
  iat?: number;
  exp?: number;
  iss?: string;
}

export interface RequestUser {
  id: string;
  email: string;
  roles: UserRole[];
  permissions: Permission[];
  sessionId: string;
}
