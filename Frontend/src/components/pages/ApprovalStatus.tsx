import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { Button, Card, Result, Skeleton, Typography } from "antd";
import { useDispatch } from "react-redux";
import { fetchCurrentUser } from "../../store/authSlice";
import type { AppDispatch } from "../../store/store";
import { useAuthBootstrap } from "../../hooks/useAuthBootstrap";
import { getDefaultRoute } from "../../utils/authorization";
import { confirmSubscriptionCheckout } from "../../services/api";

export default function ApprovalStatus() {
  const { isReady, user } = useAuthBootstrap();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const checkoutParams = new URLSearchParams(location.search);
  const checkoutSuccess = checkoutParams.get("checkout") === "success";
  const checkoutSessionId = checkoutParams.get("session_id");
  const [checkoutConfirmation, setCheckoutConfirmation] = useState<"pending" | "done">(checkoutSuccess ? "pending" : "done");
  const [checkoutConfirmationError, setCheckoutConfirmationError] = useState("");

  useEffect(() => {
    if (!checkoutSuccess || !isReady || !user) return;
    let cancelled = false;
    const confirm = async () => {
      try {
        if (!checkoutSessionId) throw new Error("The Checkout return did not include a session ID.");
        await confirmSubscriptionCheckout(checkoutSessionId);
        await dispatch(fetchCurrentUser()).unwrap();
      } catch (error) {
        if (!cancelled) setCheckoutConfirmationError(error instanceof Error ? error.message : "Could not confirm the Stripe payment.");
      } finally {
        if (!cancelled) setCheckoutConfirmation("done");
      }
    };
    void confirm();
    return () => { cancelled = true; };
  }, [checkoutSuccess, checkoutSessionId, dispatch, isReady, user]);

  useEffect(() => {
    if (checkoutSuccess && checkoutConfirmation !== "done") return;
    if (checkoutSuccess && checkoutConfirmationError) {
      const sessionQuery = checkoutSessionId ? `&session_id=${encodeURIComponent(checkoutSessionId)}` : "";
      navigate(`/subscription?checkout=confirm_failed${sessionQuery}`, { replace: true });
      return;
    }
    if (user?.Tenant?.approvalStatus === "approved") {
      const subscription = user.Tenant.PlatformSubscription;
      navigate(subscription && subscription.status !== "active" ? "/subscription" : getDefaultRoute(user), { replace: true });
    }
  }, [checkoutConfirmation, checkoutConfirmationError, checkoutSessionId, checkoutSuccess, navigate, user]);

  if (checkoutSuccess && checkoutConfirmation !== "done") return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#F1F5F9", padding: 20 }}><Card style={{ width: "100%", maxWidth: 640 }}><Skeleton active paragraph={{ rows: 4 }} /></Card></div>;

  if (!isReady) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#F1F5F9", padding: 20 }}><Card style={{ width: "100%", maxWidth: 640 }}><Skeleton active paragraph={{ rows: 4 }} /></Card></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.isSuperAdmin) return <Navigate to="/super-admin" replace />;
  if (!user.tenantId) return <Navigate to="/onboarding" replace />;

  const rejected = user.Tenant?.approvalStatus === "rejected";
  return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#F1F5F9", padding: 20 }}>
    <Card style={{ width: "100%", maxWidth: 640, borderRadius: 16 }}>
      <Result
        status={rejected ? "error" : "info"}
        title={rejected ? "Hospital application needs changes" : "Hospital submitted for approval"}
        subTitle={rejected
          ? user.Tenant?.approvalNote || "The CareBase team could not approve this hospital yet. Contact support for next steps."
          : "Your hospital registration is in the CareBase review queue. You can sign in again later to check its status."}
        extra={<div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <Button type="primary" onClick={() => void dispatch(fetchCurrentUser()).unwrap()}>{rejected ? "Check status" : "Refresh approval status"}</Button>
          <Button onClick={() => navigate("/subscription")}>View subscription</Button>
        </div>}
      />
      <Typography.Paragraph type="secondary" style={{ textAlign: "center", marginBottom: 0 }}>
        {user.Tenant?.approvalStatus === "pending" ? "Hospital access will open after approval." : "If you have updated your application details, contact CareBase support."}
      </Typography.Paragraph>
    </Card>
  </div>;
}
