import type { Role, User } from "../generated/prisma/index.js";

export type AuthenticatedUser = Pick<
  User,
  | "id"
  | "email"
  | "name"
  | "tenantId"
  | "roleId"
  | "isSuperAdmin"
  | "isActive"
>;

export type { Role };