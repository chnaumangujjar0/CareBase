import type { AuthUser } from "../types/auth";

export const hasPermission = (user: AuthUser | null | undefined, permission: string): boolean =>
  Boolean(user?.permissions?.includes("*") || user?.permissions?.includes(permission));

export const hasAnyPermission = (
  user: AuthUser | null | undefined,
  permissions: string[],
): boolean => permissions.some((permission) => hasPermission(user, permission));

export const hasRole = (user: AuthUser | null | undefined, roles: string[]): boolean =>
  Boolean(user?.role && roles.some((role) => role.toLowerCase() === user.role?.toLowerCase()));

export const getDefaultRoute = (user: AuthUser | null | undefined): string => {
  if (!user) return "/login";
  if (hasPermission(user, "hr:dashboard:read")) return "/hr";
  if (["pharmacist", "head pharmacist"].includes(user.role?.trim().toLowerCase() ?? "")
    && hasPermission(user, "clinical:medicines:read")) return "/pharmacy";
  if (hasPermission(user, "billing:invoices:read") || hasPermission(user, "billing:rates:read")) return "/billing";
  if (hasPermission(user, "dashboard:read")) return "/dashboard";
  if (hasPermission(user, "appointments:read")) return "/appointments";
  if (hasPermission(user, "patients:read")) return "/patient";
  if (hasPermission(user, "clinical:encounters:read")) return "/clinical";
  return "/unauthorized";
};
