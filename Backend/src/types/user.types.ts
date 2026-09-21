export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  tenantId: string | null;
  roleId: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
}

export interface Role {
  id: string;
  name: string;
  permissions: string;
  createdAt: string;
  updatedAt: string;
}