const configuredSuperAdminEmails = new Set(
  (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export const isConfiguredSuperAdmin = (email: string | null | undefined): boolean =>
  Boolean(email && configuredSuperAdminEmails.has(email.trim().toLowerCase()));
