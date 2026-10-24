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
> & {
  Tenant: {
    approvalStatus: string;
    approvalNote: string | null;
    PlatformSubscription: { plan: string; status: string; currentPeriodEnd: Date | null; cancelAtPeriodEnd: boolean } | null;
  } | null;
};

export type { Role };
