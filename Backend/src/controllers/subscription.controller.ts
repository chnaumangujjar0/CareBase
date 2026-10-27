import type { Request, Response } from "express";
import Stripe from "stripe";
import { db } from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const SUBSCRIPTION_PLANS = {
  starter: {
    name: "Starter",
    amountCents: 10000,
    priceEnv: "STRIPE_PRICE_STARTER",
  },
  growth: {
    name: "Growth",
    amountCents: 20000,
    priceEnv: "STRIPE_PRICE_GROWTH",
  },
  plus: { name: "Plus", amountCents: 25000, priceEnv: "STRIPE_PRICE_PLUS" },
} as const;

type PlanKey = keyof typeof SUBSCRIPTION_PLANS;

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key)
    throw new ApiError(
      503,
      "Subscription payments are not configured on the server.",
    );
  if (key.startsWith("pk_")) {
    throw new ApiError(
      503,
      "STRIPE_SECRET_KEY contains a publishable key. Set a backend Stripe secret key (sk_test_... or sk_live_...).",
    );
  }
  return new Stripe(key);
};

const getTenantOwner = async (req: Request) => {
  const user = req.user;
  if (!user?.id || !user.tenantId || !user.roleId || user.isSuperAdmin) {
    throw new ApiError(403, "A hospital owner account is required.");
  }
  const role = await db.role.findFirst({
    where: { id: user.roleId, tenantId: user.tenantId },
  });
  if (!["Owner", "Admin"].includes(role?.name ?? "")) {
    throw new ApiError(
      403,
      "Only a hospital owner or administrator can manage its subscription.",
    );
  }
  const tenant = await db.tenant.findUnique({ where: { id: user.tenantId } });
  if (!tenant) throw new ApiError(404, "Hospital workspace not found.");
  return { user, tenant };
};

const getConfiguredPlanPrice = async (plan: PlanKey) => {
  const planConfig = SUBSCRIPTION_PLANS[plan];
  const priceId = process.env[planConfig.priceEnv];
  if (!priceId)
    throw new ApiError(
      503,
      `${planConfig.name} plan price is not configured on the server.`,
    );
  if (!/^price_[A-Za-z0-9]+$/.test(priceId)) {
    throw new ApiError(
      503,
      `${planConfig.priceEnv} must contain the Stripe Price ID (price_...), not the amount or Product ID.`,
    );
  }
  const stripePrice = await getStripe().prices.retrieve(priceId);
  if (
    !stripePrice.active ||
    stripePrice.currency !== "usd" ||
    stripePrice.recurring?.interval !== "month" ||
    stripePrice.unit_amount !== planConfig.amountCents
  ) {
    throw new ApiError(
      503,
      `${planConfig.name} Stripe Price must be active, monthly, USD, and match the advertised amount.`,
    );
  }
  return { planConfig, priceId };
};

export const createCheckoutSession = asyncHandler(
  async (req: Request, res: Response) => {
    const { user, tenant } = await getTenantOwner(req);
    const plan = req.body?.plan as PlanKey;
    if (!Object.hasOwn(SUBSCRIPTION_PLANS, plan))
      throw new ApiError(400, "Choose a valid subscription plan.");

    const { planConfig, priceId } = await getConfiguredPlanPrice(plan);
    const stripe = getStripe();

    const existing = await db.platformSubscription.findUnique({
      where: { tenantId: tenant.id },
    });
    if (
      existing &&
      ["active", "trialing", "past_due", "unpaid"].includes(existing.status)
    ) {
      throw new ApiError(
        409,
        "A subscription already exists. Use Manage billing to change or update it.",
      );
    }

    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl)
      throw new ApiError(503, "FRONTEND_URL is not configured on the server.");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer: existing?.stripeCustomerId ?? undefined,
      customer_email: existing?.stripeCustomerId ? undefined : user.email,
      client_reference_id: tenant.id,
      metadata: { tenantId: tenant.id, plan },
      subscription_data: { metadata: { tenantId: tenant.id, plan } },
      success_url: `${frontendUrl.replace(/\/$/, "")}/approval-status?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
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

    if (!session.url)
      throw new ApiError(502, "Stripe did not return a Checkout URL.");
    return res
      .status(200)
      .json(
        new ApiResponse(200, { url: session.url }, "Checkout session created."),
      );
  },
);

export const getSubscription = asyncHandler(
  async (req: Request, res: Response) => {
    const { tenant } = await getTenantOwner(req);
    const subscription = await db.platformSubscription.findUnique({
      where: { tenantId: tenant.id },
    });
    const plan = subscription?.plan as PlanKey | undefined;
    const planConfig =
      plan && Object.hasOwn(SUBSCRIPTION_PLANS, plan)
        ? SUBSCRIPTION_PLANS[plan]
        : null;
    return res.status(200).json(
      new ApiResponse(200, {
        plan: subscription?.plan ?? null,
        status: subscription?.status ?? "none",
        amountCents: planConfig?.amountCents ?? null,
        currency: "usd",
        interval: "month",
        currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      }),
    );
  },
);

export const changeSubscriptionPlan = asyncHandler(
  async (req: Request, res: Response) => {
    const { tenant } = await getTenantOwner(req);
    const plan = req.body?.plan as PlanKey;
    if (!Object.hasOwn(SUBSCRIPTION_PLANS, plan))
      throw new ApiError(400, "Choose a valid subscription plan.");

    const { planConfig, priceId } = await getConfiguredPlanPrice(plan);
    const existing = await db.platformSubscription.findUnique({
      where: { tenantId: tenant.id },
    });
    if (!existing?.stripeSubscriptionId || !existing.stripeCustomerId) {
      throw new ApiError(
        409,
        "No active Stripe subscription is linked to this hospital.",
      );
    }
    if (!["active", "trialing"].includes(existing.status)) {
      throw new ApiError(
        409,
        "Resolve the current payment issue in Manage billing before changing plans.",
      );
    }
    if (existing.stripePriceId === priceId || existing.plan === plan) {
      throw new ApiError(
        409,
        `The hospital is already on the ${planConfig.name} plan.`,
      );
    }

    const stripeSubscription = await getStripe().subscriptions.retrieve(
      existing.stripeSubscriptionId,
    );
    if (!["active", "trialing"].includes(stripeSubscription.status)) {
      throw new ApiError(
        409,
        "Stripe reports that this subscription is not active. Resolve it in Manage billing first.",
      );
    }
    const item = stripeSubscription.items.data[0];
    if (!item)
      throw new ApiError(
        409,
        "The Stripe subscription has no recurring price to update.",
      );

    const updated = await getStripe().subscriptions.update(
      existing.stripeSubscriptionId,
      {
        items: [{ id: item.id, price: priceId }],
        proration_behavior: "always_invoice",
        payment_behavior: "pending_if_incomplete",
        metadata: { ...stripeSubscription.metadata, tenantId: tenant.id, plan },
      },
    );
    const subscription = await syncStripeSubscription(updated, tenant.id);
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          plan: subscription.plan,
          status: subscription.status,
          amountCents: planConfig.amountCents,
          currency: "usd",
          interval: "month",
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        },
        "Plan change submitted. Stripe applied prorations through the current billing period.",
      ),
    );
  },
);

const syncStripeSubscription = async (
  stripeSubscription: Stripe.Subscription,
  tenantIdOverride?: string,
) => {
  const customerId =
    typeof stripeSubscription.customer === "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer.id;
  const existing = await db.platformSubscription.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId: stripeSubscription.id },
        { stripeCustomerId: customerId },
      ],
    },
  });
  const tenantId =
    tenantIdOverride ||
    stripeSubscription.metadata.tenantId ||
    existing?.tenantId;
  if (!tenantId)
    throw new ApiError(
      400,
      "Stripe subscription is not linked to a CareBase hospital.",
    );

  const priceId =
    stripeSubscription.items.data[0]?.price.id || existing?.stripePriceId;
  if (!priceId)
    throw new ApiError(400, "Stripe subscription has no recurring Price ID.");
  const periodEnd = stripeSubscription.items.data[0]?.current_period_end;
  const data = {
    plan: stripeSubscription.metadata.plan || existing?.plan || "starter",
    status: stripeSubscription.status,
    stripeCustomerId: customerId,
    stripeSubscriptionId: stripeSubscription.id,
    stripePriceId: priceId,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
  };
  return db.platformSubscription.upsert({
    where: { tenantId },
    create: { tenantId, ...data },
    update: data,
  });
};

export const confirmCheckoutSession = asyncHandler(
  async (req: Request, res: Response) => {
    const { tenant } = await getTenantOwner(req);
    const sessionId = req.body?.sessionId;
    if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
      throw new ApiError(
        400,
        "A valid Stripe Checkout session ID is required.",
      );
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (
      session.mode !== "subscription" ||
      session.status !== "complete" ||
      session.payment_status !== "paid" ||
      session.client_reference_id !== tenant.id ||
      session.metadata?.tenantId !== tenant.id
    ) {
      throw new ApiError(
        409,
        "Stripe has not confirmed a paid subscription for this hospital.",
      );
    }

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
    if (!subscriptionId)
      throw new ApiError(
        409,
        "The completed Checkout session has no subscription.",
      );
    const stripeSubscription =
      await stripe.subscriptions.retrieve(subscriptionId);
    if (stripeSubscription.status !== "active") {
      throw new ApiError(
        409,
        "Stripe is still processing the subscription payment.",
      );
    }

    const subscription = await syncStripeSubscription(
      stripeSubscription,
      tenant.id,
    );
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          plan: subscription.plan,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        },
        "Stripe subscription confirmed.",
      ),
    );
  },
);

export const createBillingPortalSession = asyncHandler(
  async (req: Request, res: Response) => {
    const { tenant } = await getTenantOwner(req);
    const subscription = await db.platformSubscription.findUnique({
      where: { tenantId: tenant.id },
    });
    if (!subscription?.stripeCustomerId)
      throw new ApiError(
        409,
        "No Stripe customer is linked to this hospital yet.",
      );
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl)
      throw new ApiError(503, "FRONTEND_URL is not configured on the server.");

    const portal = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${frontendUrl.replace(/\/$/, "")}/subscription`,
    });
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { url: portal.url },
          "Billing portal session created.",
        ),
      );
  },
);

export const handleStripeWebhook = asyncHandler(
  async (req: Request, res: Response) => {
    const signature = req.header("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!signature || !webhookSecret || !Buffer.isBuffer(req.body)) {
      throw new ApiError(400, "Invalid Stripe webhook request.");
    }

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret,
      );
    } catch {
      throw new ApiError(400, "Stripe webhook signature verification failed.");
    }

    // Re-sync the latest Stripe state even on a resent event. This lets Dashboard/CLI retries
    // repair subscriptions created before the Checkout return confirmation was added.
    if (event.type.startsWith("customer.subscription.")) {
      const eventSubscription = event.data.object as Stripe.Subscription;
      const currentSubscription = await getStripe().subscriptions.retrieve(
        eventSubscription.id,
      );
      await syncStripeSubscription(currentSubscription);
    } else if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      const tenantId =
        session.metadata?.tenantId || session.client_reference_id || undefined;
      if (session.mode === "subscription" && subscriptionId && tenantId) {
        const stripeSubscription =
          await getStripe().subscriptions.retrieve(subscriptionId);
        await syncStripeSubscription(stripeSubscription, tenantId);
      }
    } else if (
      event.type === "invoice.payment_failed" ||
      event.type === "invoice.paid"
    ) {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceData = invoice as unknown as {
        subscription?: string | { id: string } | null;
      };
      const subscriptionId =
        typeof invoiceData.subscription === "string"
          ? invoiceData.subscription
          : invoiceData.subscription?.id;
      if (subscriptionId) {
        const stripeSubscription =
          await getStripe().subscriptions.retrieve(subscriptionId);
        await syncStripeSubscription(stripeSubscription);
      }
    }
    const duplicate = await db.stripeWebhookEvent.findUnique({
      where: { id: event.id },
    });
    if (!duplicate)
      await db.stripeWebhookEvent.create({
        data: { id: event.id, type: event.type },
      });

    return res.status(200).json({ received: true });
  },
);
