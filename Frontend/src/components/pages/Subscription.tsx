import { useCallback, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { Alert, Button, Card, Col, Result, Row, Spin, Typography } from "antd";
import { useAuthBootstrap } from "../../hooks/useAuthBootstrap";
import {
  getApiErrorMessage,
  getCurrentSubscription,
  openSubscriptionBillingPortal,
  startSubscriptionCheckout,
  type CurrentSubscription,
  type SubscriptionPlanKey,
} from "../../services/api";

const plans: Array<{ id: SubscriptionPlanKey; name: string; price: string; summary: string; features: string[] }> = [
  { id: "starter", name: "Starter", price: "$100", summary: "For a single hospital starting with core workflows.", features: ["Patient and appointment workflows", "Clinical records and hospital billing", "Standard support"] },
  { id: "growth", name: "Growth", price: "$200", summary: "For hospitals using pharmacy and reporting workflows.", features: ["Everything in Starter", "Pharmacy and inventory workflows", "Expanded operational reports"] },
  { id: "plus", name: "Plus", price: "$250", summary: "For hospitals needing broader operations support.", features: ["All current CareBase modules", "Advanced reporting", "Onboarding assistance"] },
];

export default function Subscription() {
  const { isReady, user } = useAuthBootstrap();
  const location = useLocation();
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user?.tenantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setSubscription(await getCurrentSubscription());
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load the subscription."));
    } finally {
      setLoading(false);
    }
  }, [user?.tenantId]);

  useEffect(() => { void refresh(); }, [refresh]);

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

  if (!isReady || loading) return <Spin fullscreen spinning tip="Loading subscription..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.isSuperAdmin) return <Navigate to="/super-admin" replace />;
  if (!user.tenantId) return <Navigate to="/onboarding" replace />;

  const checkoutState = new URLSearchParams(location.search).get("checkout");
  const hasStripeCustomer = Boolean(subscription && subscription.status !== "none" && subscription.status !== "incomplete");

  return (
    <main style={{ minHeight: "100vh", background: "#f1f5f9", padding: "40px 20px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Typography.Title level={2}>CareBase subscription</Typography.Title>
        <Typography.Paragraph type="secondary">Choose a monthly USD plan. Hospital access opens after CareBase approves your registration.</Typography.Paragraph>
        {checkoutState === "cancelled" && <Alert type="info" showIcon message="Checkout was cancelled. No subscription was started." style={{ marginBottom: 16 }} />}
        {checkoutState === "retry" && <Alert type="warning" showIcon message="Your hospital was created, but payment setup did not start. Choose a plan below to retry." style={{ marginBottom: 16 }} />}
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {subscription && subscription.status !== "none" && (
          <Card style={{ marginBottom: 24 }}>
            <Typography.Text strong>Current status: </Typography.Text>{subscription.status}
            {subscription.plan && <> · {plans.find((plan) => plan.id === subscription.plan)?.name ?? subscription.plan} plan</>}
            {subscription.currentPeriodEnd && <> · renews through {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</>}
            {hasStripeCustomer && <Button style={{ marginLeft: 16 }} onClick={() => void manageBilling()} loading={busy}>Manage billing</Button>}
          </Card>
        )}
        <Row gutter={[16, 16]}>
          {plans.map((plan) => (
            <Col xs={24} md={8} key={plan.id}>
              <Card title={plan.name} style={{ height: "100%" }}>
                <Typography.Title level={2} style={{ marginTop: 0 }}>{plan.price}<Typography.Text type="secondary" style={{ fontSize: 14 }}> / month</Typography.Text></Typography.Title>
                <Typography.Paragraph>{plan.summary}</Typography.Paragraph>
                <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                <Button type="primary" block disabled={busy || hasStripeCustomer} onClick={() => void checkout(plan.id)} loading={busy && subscription?.plan === plan.id}>
                  {hasStripeCustomer ? "Subscription already exists" : "Continue to Stripe Checkout"}
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
        <Result status="info" title="Plan features are proposed" subTitle="Plan selection and monthly billing are connected. Enforcing different module or user limits requires adding plan entitlements to CareBase access checks." />
      </div>
    </main>
  );
}
