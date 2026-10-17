ALTER TABLE "Tenant"
ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'approved',
ADD COLUMN "approvalNote" TEXT,
ADD COLUMN "approvalReviewedAt" TIMESTAMPTZ(6);

ALTER TABLE "Tenant"
ADD CONSTRAINT "Tenant_approvalStatus_check"
CHECK ("approvalStatus" IN ('pending', 'approved', 'rejected'));

-- Public registration must not grant platform administrator access.
UPDATE "User" SET "isSuperAdmin" = false;
