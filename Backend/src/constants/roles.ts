export const STANDARD_ROLES = {
  Owner: ["*"],
  Admin: [
    "dashboard:read",
    "appointments:read",
    "appointments:write",
    "patients:read",
    "patients:write",
    "clinical:encounters:read",
    "clinical:encounters:write",
    "clinical:consultations:write",
    "clinical:prescriptions:write",
    "clinical:admissions:read",
    "clinical:admissions:write",
    "clinical:admissions:discharge",
    "clinical:beds:write",
    "clinical:surgeries:read",
    "clinical:surgeries:write",
    "clinical:medicines:read",
    "clinical:medicines:write",
    "billing:invoices:read",
    "billing:invoices:write",
    "billing:payments:write",
    "billing:rates:read",
    "billing:rates:write",
  ],
  Doctor: [
    "dashboard:read",
    "appointments:read",
    "appointments:write",
    "patients:read",
    "patients:write",
    "clinical:encounters:read",
    "clinical:encounters:write",
    "clinical:consultations:write",
    "clinical:prescriptions:write",
    "clinical:admissions:read",
    "clinical:admissions:write",
    "clinical:surgeries:read",
    "clinical:surgeries:write",
    "clinical:medicines:read",
    "billing:rates:read",
    "billing:rates:write",
  ],
  Nurse: [
    "dashboard:read",
    "patients:read",
    "clinical:encounters:read",
    "clinical:admissions:read",
    "clinical:beds:write",
    "clinical:medicines:read",
  ],
  Receptionist: [
    "dashboard:read",
    "appointments:read",
    "appointments:write",
    "patients:read",
    "patients:write",
    "clinical:encounters:read",
    "clinical:encounters:write",
    "clinical:admissions:read",
    "billing:invoices:read",
    "billing:invoices:write",
    "billing:rates:read",
  ],
  "Head Receptionist": [
    "dashboard:read",
    "appointments:read",
    "appointments:write",
    "patients:read",
    "patients:write",
    "clinical:encounters:read",
    "clinical:encounters:write",
    "clinical:admissions:read",
    "billing:invoices:read",
    "billing:invoices:write",
    "billing:payments:write",
    "billing:rates:read",
  ],
  "Billing Staff": [
    "billing:invoices:read",
    "billing:invoices:write",
    "billing:payments:write",
    "billing:rates:read",
  ],
  Pharmacist: [
    "clinical:medicines:read",
    "clinical:medicines:write",
  ],
  "Head Pharmacist": [
    "clinical:medicines:read",
    "clinical:medicines:write",
  ],
} as const;

export type StandardRoleName = keyof typeof STANDARD_ROLES;

export const STANDARD_ROLE_NAMES = Object.keys(STANDARD_ROLES) as StandardRoleName[];

export const getStandardRolePermissions = (name: string): string[] => {
  const normalizedName = name.trim().toLowerCase().replaceAll("_", " ").replace(/\s+/g, " ");
  const standardRoleName = STANDARD_ROLE_NAMES.find((roleName) => roleName.toLowerCase() === normalizedName);
  const permissions = standardRoleName ? STANDARD_ROLES[standardRoleName] : undefined;
  return permissions ? [...permissions] : [];
};

export const getEffectiveRolePermissions = (name: string, storedPermissions: unknown): string[] => {
  const standardPermissions = getStandardRolePermissions(name);
  if (standardPermissions.length > 0) {
    return standardPermissions;
  }

  return Array.isArray(storedPermissions)
    ? storedPermissions.filter((permission): permission is string => typeof permission === "string")
    : [];
};
