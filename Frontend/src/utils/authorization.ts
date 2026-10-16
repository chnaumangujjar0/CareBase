import type { AuthUser } from "../types/auth";

export const hasPermission = (user: AuthUser | null | undefined, permission: string): boolean =>
  Boolean(user?.permissions?.includes("*") || user?.permissions?.includes(permission));

export const hasAnyPermission = (
  user: AuthUser | null | undefined,
  permissions: string[],
): boolean => permissions.some((permission) => hasPermission(user, permission));

export const hasRole = (user: AuthUser | null | undefined, roles: string[]): boolean =>
  Boolean(user?.role && roles.some((role) => role.toLowerCase() === user.role?.toLowerCase()));
