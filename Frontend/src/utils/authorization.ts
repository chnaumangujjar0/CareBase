import type { AuthUser } from "../types/auth";

export const hasPermission = (user: AuthUser | null | undefined, permission: string): boolean =>
  Boolean(user?.permissions?.includes("*") || user?.permissions?.includes(permission));

export const hasAnyPermission = (
  user: AuthUser | null | undefined,
  permissions: string[],
): boolean => permissions.some((permission) => hasPermission(user, permission));

export const hasRole = (user: AuthUser | null | undefined, roles: string[]): boolean =>
  Boolean(user?.role && roles.some((role) => role.toLowerCase() === user.role?.toLowerCase()));

const ROLE_HOME: Record<string, { route: string; permission: string }> = {
  owner: { route: "/dashboard", permission: "dashboard:read" },
  admin: { route: "/dashboard", permission: "dashboard:read" },
  doctor: { route: "/clinical", permission: "clinical:encounters:read" },
  nurse: { route: "/clinical", permission: "clinical:encounters:read" },
  receptionist: { route: "/appointments", permission: "appointments:read" },
  "head receptionist": { route: "/appointments", permission: "appointments:read" },
  hr: { route: "/hr", permission: "hr:dashboard:read" },
  "billing staff": { route: "/billing", permission: "billing:invoices:read" },
  pharmacist: { route: "/pharmacy", permission: "clinical:medicines:read" },
  "head pharmacist": { route: "/pharmacy", permission: "clinical:medicines:read" },
};

const normalizeRoleName = (role: string | null | undefined): string =>
  role?.trim().toLowerCase().replaceAll("_", " ").replaceAll("-", " ").replace(/\s+/g, " ") ?? "";

export const getDefaultRoute = (user: AuthUser | null | undefined): string => {
  if (!user) return "/login";

  if (user.isSuperAdmin) return "/super-admin";
  if (!user.tenantId || !user.roleId) return "/onboarding";
  if (user.Tenant?.approvalStatus && user.Tenant.approvalStatus !== "approved") return "/approval-status";
  if (user.Tenant?.PlatformSubscription && user.Tenant.PlatformSubscription.status !== "active") return "/subscription";

  const roleName = normalizeRoleName(user.role);
  const roleHome = ROLE_HOME[roleName];
  if (roleHome && hasPermission(user, roleHome.permission)) return roleHome.route;

  // Permission-based fallback keeps custom roles useful without routing them to a page they cannot open.
  if (hasPermission(user, "hr:dashboard:read")) return "/hr";
  if (["pharmacist", "head pharmacist"].includes(roleName)
    && hasPermission(user, "clinical:medicines:read")) return "/pharmacy";
  if (hasPermission(user, "billing:invoices:read") || hasPermission(user, "billing:rates:read")) return "/billing";
  if (hasPermission(user, "dashboard:read")) return "/dashboard";
  if (hasPermission(user, "appointments:read")) return "/appointments";
  if (hasPermission(user, "patients:read")) return "/patient";
  if (hasPermission(user, "clinical:encounters:read")) return "/clinical";
  return "/unauthorized";
};
