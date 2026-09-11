import { z } from "zod";

export const OWNER_PERMISSIONS = ["*"] as const;

export const SAFE_USER_FIELDS = [
  "id",
  "name",
  "email",
  "tenantId",
  "roleId",
  "isActive",
  "createdAt",
  "updatedAt",
] as const;

export const completeOnboardingSchema = z.object({
  tenantName: z
    .string({ error: "Hospital name is required" })
    .trim()
    .min(2, "Hospital name must be at least 2 characters")
    .max(120, "Hospital name must be under 120 characters"),
  address: z.string().trim().max(255).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
});

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;

export const slugifyTenantName = (name: string, userId: string): string => {
  const core = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${core || "hospital"}-${userId.slice(0, 8)}`;
};

export const emptyOptionalFields = (input: CompleteOnboardingInput) => ({
  address: input.address || undefined,
  city: input.city || undefined,
  state: input.state || undefined,
  country: input.country || undefined,
  postalCode: input.postalCode || undefined,
});