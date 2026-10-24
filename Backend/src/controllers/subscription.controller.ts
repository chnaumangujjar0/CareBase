import type { Request, Response } from "express";
import Stripe from "stripe";
import { db } from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const SUBSCRIPTION_PLANS = {
  starter: { name: "Starter", amountCents: 10000, priceEnv: "STRIPE_PRICE_STARTER" },
  growth: { name: "Growth", amountCents: 20000, priceEnv: "STRIPE_PRICE_GROWTH" },
  plus: { name: "Plus", amountCents: 25000, priceEnv: "STRIPE_PRICE_PLUS" },
} as const;

type PlanKey = keyof typeof SUBSCRIPTION_PLANS;

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new ApiError(503, "Subscription payments are not configured on the server.");
  return new Stripe(key);
};

const getTenantOwner = async (req: Request) => {
  const user = req.user;
  if (!user?.id || !user.tenantId || !user.roleId || user.isSuperAdmin) {
    throw new ApiError(403, "A hospital owner account is required.");
  }
  const role = await db.role.findFirst({ where: { id: user.roleId, tenantId: user.tenantId } });
  if (role?.name !== "Owner") throw new ApiError(403, "Only the hospital owner can manage its subscription.");
  const tenant = await db.tenant.findUnique({ where: { id: user.tenantId } });
  if (!tenant) throw new ApiError(404, "Hospital workspace not found.");
  return { user, tenant };
};

export const createCheckoutSession = asyncHandler(async (req: Request, res: Response) => {
  const { user, tenant } = await getTenantOwner(req);
  const plan = req.body?.plan as PlanKey;
  if (!Object.hasOwn(SUBSCRIPTION_PLANS, plan)) throw new ApiError(400, "Choose a valid subscription plan.");

  const planConfig = SUBSCRIPTION_PLANS[plan];
  const priceId = process.env[planConfig.priceEnv];
  if (!priceId) throw new ApiError(503, `${planConfig.name} plan price is not configured on the server.`);
  const stripe = getStripe();
  const stripePrice = await stripe.prices.retrieve(priceId);
  if (
    !stripePrice.active ||
    stripePrice.currency !== "usd" ||
    stripePrice.recurring?.interval !== "month" ||
    stripePrice.unit_amount !== planConfig.amountCents
  ) {
    throw new ApiError(503, `${planConfig.name} Stripe Price must be active, monthly, USD, and match the advertised amount.`);
  }

  const existing = await db.platformSubscription.findUnique({ where: { tenantId: tenant.id } });
  if (existing && ["active", "trialing", "past_due", "unpaid"].includes(existing.status)) {
    throw new ApiError(409, "A subscription already exists. Use Manage billing to change or update it.");
  }

  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) throw new ApiError(503, "FRONTEND_URL is not configured on the server.");

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer: existing?.stripeCustomerId ?? undefined,
    customer_email: existing?.stripeCustomerId ? undefined : user.email,
    client_reference_id: tenant.id,
    metadata: { tenantId: tenant.id, plan },
    subscription_data: { metadata: { tenantId: tenant.id, plan } },
    success_url: `${frontendUrl.replace(/\/$/, "")}/approval-status?checkout=success`,
    cancel_url: `${frontendUrl.replace(/\/$/, "")}/subscription?checkout=cancelled`,
  });

  await db.platformSubscription.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      plan,
      status: "incomplete",
      stripeCustomerId: existing?.stripeCustomerId ?? null,
      stripePriceId: priceId,
    },
    // Do not reset status here: the subscription webhook can arrive before this update.
    update: { plan, stripePriceId: priceId },
  });

  if (!session.url) throw new ApiError(502, "Stripe did not return a Checkout URL.");
  return res.status(200).json(new ApiResponse(200, { url: session.url }, "Checkout session created."));
});

export const getSubscription = asyncHandler(async (req: Request, res: Response) => {
  const { tenant } = await getTenantOwner(req);
  const subscription = await db.platformSubscription.findUnique({ where: { tenantId: tenant.id } });
  return res.status(200).json(new ApiResponse(200, {
    plan: subscription?.plan ?? null,
    status: subscription?.status ?? "none",
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
  }));
});

export const createBillingPortalSession = asyncHandler(async (req: Request, res: Response) => {
  const { tenant } = await getTenantOwner(req);
  const subscription = await db.platformSubscription.findUnique({ where: { tenantId: tenant.id } });
  if (!subscription?.stripeCustomerId) throw new ApiError(409, "No Stripe customer is linked to this hospital yet.");
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) throw new ApiError(503, "FRONTEND_URL is not configured on the server.");

  const portal = await getStripe().billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${frontendUrl.replace(/\/$/, "")}/subscription`,
  });
  return res.status(200).json(new ApiResponse(200, { url: portal.url }, "Billing portal session created."));
});

export const handleStripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.header("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret || !Buffer.isBuffer(req.body)) {
    throw new ApiError(400, "Invalid Stripe webhook request.");
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch {
    throw new ApiError(400, "Stripe webhook signature verification failed.");
  }

  const duplicate = await db.stripeWebhookEvent.findUnique({ where: { id: event.id } });
  if (duplicate) return res.status(200).json({ received: true });

  await db.$transaction(async (tx) => {
    if (event.type.startsWith("customer.subscription.")) {
      const stripeSubscription = event.data.object as Stripe.Subscription;
      const tenantId = stripeSubscription.metadata.tenantId;
      const customerId = typeof stripeSubscription.customer === "string"
        ? stripeSubscription.customer
        : stripeSubscription.customer.id;
      const existing = await tx.platformSubscription.findFirst({
        where: { OR: [{ stripeSubscriptionId: stripeSubscription.id }, { stripeCustomerId: customerId }] },
      });
      const resolvedTenantId = tenantId || existing?.tenantId;
      if (resolvedTenantId) {
        const firstPrice = stripeSubscription.items.data[0]?.price.id;
        const periodEnd = stripeSubscription.items.data[0]?.current_period_end;
        const plan = (stripeSubscription.metadata.plan || existing?.plan || "starter") as string;
        const priceId = firstPrice || existing?.stripePriceId;
        if (priceId) {
          const data = {
            plan,
            status: stripeSubscription.status,
            stripeCustomerId: customerId,
            stripeSubscriptionId: stripeSubscription.id,
            stripePriceId: priceId,
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          };
          await tx.platformSubscription.upsert({
            where: { tenantId: resolvedTenantId },
            create: { tenantId: resolvedTenantId, ...data },
            update: data,
          });
        }
      }
    }
    await tx.stripeWebhookEvent.create({ data: { id: event.id, type: event.type } });
  });

  return res.status(200).json({ received: true });
});
