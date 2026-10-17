export interface AuthUser {
  id: string;
  name: string;
  username?: string;
  email: string;
  tenantId: string | null;
  roleId: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  avatar?: string;
  authProvider?: "local" | "auth0";
  createdAt: string;
  updatedAt: string;
  role?: string | null;
  permissions?: string[];
  Tenant?: { approvalStatus: "pending" | "approved" | "rejected"; approvalNote: string | null } | null;
}

export type Permission = string;
interface role {
  id: string;
  name: string;
  permissions: string[];
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  logo?: string;
  favicon?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  approvalNote?: string | null;
  approvalReviewedAt?: string | null;
}

export interface PlatformTenant extends Tenant {
  isActive: boolean;
  approvalStatus: "pending" | "approved" | "rejected";
  approvalNote: string | null;
  approvalReviewedAt: string | null;
  User: Array<{ id: string; name: string; email: string }>;
  _count: { User: number; Patient: number };
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export interface OnboardingPayload {
  tenantName: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  logo?: File;
  favicon?: File;
}

export interface AuthResponseData {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
  role: role
}

export interface OnboardingResponseData {
  user: AuthUser;
  tenant: Tenant;
}

/** Matches the server's `new ApiResponse(statusCode, data, message)` shape. */
export interface ApiEnvelope<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}
