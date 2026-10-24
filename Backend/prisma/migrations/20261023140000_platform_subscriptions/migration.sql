CREATE TABLE "PlatformSubscription" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'incomplete',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "currentPeriodEnd" TIMESTAMPTZ(6),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "PlatformSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformSubscription_tenantId_key" ON "PlatformSubscription"("tenantId");
CREATE UNIQUE INDEX "PlatformSubscription_stripeCustomerId_key" ON "PlatformSubscription"("stripeCustomerId");
CREATE UNIQUE INDEX "PlatformSubscription_stripeSubscriptionId_key" ON "PlatformSubscription"("stripeSubscriptionId");
CREATE INDEX "PlatformSubscription_status_idx" ON "PlatformSubscription"("status");

ALTER TABLE "PlatformSubscription"
  ADD CONSTRAINT "PlatformSubscription_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
