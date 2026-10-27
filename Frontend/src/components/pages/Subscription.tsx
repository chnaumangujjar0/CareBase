import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { Alert, Button, Card, Col, Modal, Result, Row, Spin, Tag, Typography } from "antd";
import { useAuthBootstrap } from "../../hooks/useAuthBootstrap";
import {
  changeSubscriptionPlan,
  getApiErrorMessage,
  getCurrentSubscription,
  openSubscriptionBillingPortal,
  startSubscriptionCheckout,
  type CurrentSubscription,
  type SubscriptionPlanKey,
} from "../../services/api";
import { hasRole } from "../../utils/authorization";

const plans: Array<{ id: SubscriptionPlanKey; name: string; amountCents: number; summary: string }> = [
  { id: "starter", name: "Starter", amountCents: 10000, summary: "Monthly platform subscription for a hospital workspace." },
  { id: "growth", name: "Growth", amountCents: 20000, summary: "Monthly platform subscription for a growing hospital workspace." },
  { id: "plus", name: "Plus", amountCents: 25000, summary: "Monthly platform subscription for a larger hospital workspace." },
];

const activeStatuses = ["active", "trialing"];
const formatDate = (date: string | null) => date ? new Date(date).toLocaleDateString() : "Not available";
const formatPrice = (amountCents: number | null | undefined) =>
  amountCents == null ? "Not available" : `$${(amountCents / 100).toFixed(2)}`;

const statusMessage: Record<string, { type: "success" | "warning" | "error" | "info"; text: string }> = {
  active: { type: "success", text: "Your subscription is active." },
  trialing: { type: "success", text: "Your subscription is active in a trial period." },
  incomplete: { type: "warning", text: "Payment setup is incomplete. Complete checkout or open billing management to resolve it." },
  past_due: { type: "error", text: "A payment is past due. Resolve it in Manage billing to keep hospital access available." },
  unpaid: { type: "error", text: "Payment is unpaid. Resolve it in Manage billing before changing plans." },
  canceled: { type: "info", text: "This subscription is canceled. Choose a plan below to start a new subscription." },
  none: { type: "info", text: "No CareBase platform subscription is linked to this hospital yet." },
};

export default function Subscription() {
  const { isReady, user } = useAuthBootstrap();
  const location = useLocation();
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadSubscription = async () => {
      if (!user?.tenantId) {
        if (!cancelled) setLoading(false);
        return;
      }
      if (!cancelled) setLoading(true);
      try {
        const currentSubscription = await getCurrentSubscription();
        if (!cancelled) {
          setSubscription(currentSubscription);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Could not load subscription and billing details."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadSubscription();
    return () => { cancelled = true; };
  }, [user?.tenantId]);

  const checkout = async (plan: SubscriptionPlanKey) => {
    setBusy(true);
    setError("");
    try {
      window.location.assign(await startSubscriptionCheckout(plan));
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not start Stripe Checkout."));
      setBusy(false);
    }
  };

  const confirmPlanChange = async () => {
    if (!selectedPlan) return;
    setBusy(true);
    setError("");
    try {
      setSubscription(await changeSubscriptionPlan(selectedPlan));
      setSelectedPlan(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not change the subscription plan."));
    } finally {
      setBusy(false);
    }
  };

  const manageBilling = async () => {
    setBusy(true);
    setError("");
    try {
      window.location.assign(await openSubscriptionBillingPortal());
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not open billing management."));
      setBusy(false);
    }
  };

  const currentPlan = plans.find((plan) => plan.id === subscription?.plan);
  const currentAmount = subscription?.amountCents ?? currentPlan?.amountCents ?? null;
  const isActive = Boolean(subscription && activeStatuses.includes(subscription.status));
  const hasStripeSubscription = isActive && Boolean(subscription?.plan);
  const selectedPlanDetails = plans.find((plan) => plan.id === selectedPlan);
  const priceDifference = selectedPlanDetails && currentAmount != null
    ? selectedPlanDetails.amountCents - currentAmount
    : null;
  const state = statusMessage[subscription?.status ?? "none"] ?? {
    type: "info" as const,
    text: `Subscription status: ${subscription?.status ?? "unknown"}.`,
  };
  const checkoutState = new URLSearchParams(location.search).get("checkout");
  const planChangeDescription = useMemo(() => {
    if (priceDifference == null) return "Stripe will calculate any applicable prorated amount.";
    if (priceDifference > 0) return `Stripe will invoice the prorated difference of $${(priceDifference / 100).toFixed(2)} for the remainder of this billing period.`;
    if (priceDifference < 0) return `Stripe will apply a prorated credit of $${(Math.abs(priceDifference) / 100).toFixed(2)} for the remainder of this billing period.`;
    return "There is no price difference for this change.";
  }, [priceDifference]);

  if (!isReady || loading) return <Spin fullscreen spinning tip="Loading subscription and billing..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.isSuperAdmin) return <Navigate to="/super-admin" replace />;
  if (!user.tenantId) return <Navigate to="/onboarding" replace />;
  if (!hasRole(user, ["Owner", "Admin"])) return <Navigate to="/unauthorized" replace />;

  return (
    <main style={{ minHeight: "100vh", background: "#f1f5f9", padding: "40px 20px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Typography.Title level={2}>Subscription &amp; Billing</Typography.Title>
        <Typography.Paragraph type="secondary">
          Manage CareBase platform billing for this hospital. Patient invoices and payments remain in the separate Billing area.
        </Typography.Paragraph>
        {checkoutState === "cancelled" && <Alert type="info" showIcon message="Checkout was cancelled. No subscription was started." style={{ marginBottom: 16 }} />}
        {checkoutState === "retry" && <Alert type="warning" showIcon message="Payment setup did not start. Choose a plan below to retry." style={{ marginBottom: 16 }} />}
        {checkoutState === "confirm_failed" && <Alert type="warning" showIcon message="Stripe has not confirmed the checkout yet. Refresh shortly before trying again." style={{ marginBottom: 16 }} />}
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

        <Card title="Current subscription" style={{ marginBottom: 24 }}>
          <Alert type={state.type} showIcon message={state.text} style={{ marginBottom: 16 }} />
          <Row gutter={[24, 16]}>
            <Col xs={24} sm={12} md={6}><Typography.Text type="secondary">Plan</Typography.Text><br /><Typography.Text strong>{currentPlan?.name ?? subscription?.plan ?? "None"}</Typography.Text></Col>
            <Col xs={24} sm={12} md={6}><Typography.Text type="secondary">Price</Typography.Text><br /><Typography.Text strong>{formatPrice(currentAmount)} / {subscription?.interval ?? "month"}</Typography.Text></Col>
            <Col xs={24} sm={12} md={6}><Typography.Text type="secondary">Status</Typography.Text><br /><Tag color={isActive ? "green" : subscription?.status === "past_due" || subscription?.status === "unpaid" ? "red" : "gold"}>{subscription?.status ?? "none"}</Tag></Col>
            <Col xs={24} sm={12} md={6}><Typography.Text type="secondary">{subscription?.cancelAtPeriodEnd ? "Ends on" : "Next renewal"}</Typography.Text><br /><Typography.Text strong>{formatDate(subscription?.currentPeriodEnd ?? null)}</Typography.Text></Col>
          </Row>
          {subscription?.cancelAtPeriodEnd && <Alert type="warning" showIcon message="Cancellation is scheduled. Access remains available until the end date shown above." style={{ marginTop: 16 }} />}
          {subscription?.status !== "none" && subscription?.status !== "canceled" && (
            <Button style={{ marginTop: 16 }} onClick={() => void manageBilling()} loading={busy}>
              Manage billing in Stripe
            </Button>
          )}
        </Card>

        <Typography.Title level={3}>Plans</Typography.Title>
        <Typography.Paragraph type="secondary">All plans are billed monthly in USD. Price changes use Stripe prorations and take effect immediately when Stripe accepts the update.</Typography.Paragraph>
        <Row gutter={[16, 16]}>
          {plans.map((plan) => {
            const isCurrent = subscription?.plan === plan.id;
            return (
              <Col xs={24} md={8} key={plan.id}>
                <Card title={plan.name} style={{ height: "100%" }} extra={isCurrent ? <Tag color="blue">Current</Tag> : null}>
                  <Typography.Title level={2} style={{ marginTop: 0 }}>{formatPrice(plan.amountCents)}<Typography.Text type="secondary" style={{ fontSize: 14 }}> / month</Typography.Text></Typography.Title>
                  <Typography.Paragraph>{plan.summary}</Typography.Paragraph>
                  {hasStripeSubscription ? (
                    <Button type={isCurrent ? "default" : "primary"} block disabled={busy || isCurrent} onClick={() => setSelectedPlan(plan.id)}>
                      {isCurrent ? "Current plan" : "Review plan change"}
                    </Button>
                  ) : (
                    <Button type="primary" block disabled={busy} onClick={() => void checkout(plan.id)} loading={busy}>
                      Start subscription with Stripe
                    </Button>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
        <Result status="info" title="Plan entitlements are not enforced" subTitle="Changing plans updates billing only. CareBase does not currently enforce different module or user limits by plan." />
      </div>

      <Modal
        title={`Change to ${selectedPlanDetails?.name ?? "selected"} plan?`}
        open={selectedPlan !== null}
        onCancel={() => { if (!busy) setSelectedPlan(null); }}
        confirmLoading={busy}
        onOk={() => void confirmPlanChange()}
        okText="Confirm plan change"
      >
        <Typography.Paragraph>
          Your current plan is <strong>{currentPlan?.name ?? "unknown"}</strong> at <strong>{formatPrice(currentAmount)} / month</strong>.
        </Typography.Paragraph>
        <Typography.Paragraph>{planChangeDescription}</Typography.Paragraph>
        <Typography.Paragraph type="secondary">
          The new recurring price takes effect immediately. Stripe will apply the prorated charge or credit and may require payment confirmation. No second subscription will be created.
        </Typography.Paragraph>
      </Modal>
    </main>
  );
}
