import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router";
import { Button, Card, Result, Skeleton, Typography } from "antd";
import { useDispatch } from "react-redux";
import { fetchCurrentUser } from "../../store/authSlice";
import type { AppDispatch } from "../../store/store";
import { useAuthBootstrap } from "../../hooks/useAuthBootstrap";
import { getDefaultRoute } from "../../utils/authorization";

export default function ApprovalStatus() {
  const { isReady, user } = useAuthBootstrap();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.Tenant?.approvalStatus === "approved") navigate(getDefaultRoute(user), { replace: true });
  }, [navigate, user]);

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
        extra={<Button type="primary" onClick={() => void dispatch(fetchCurrentUser()).unwrap()}>{rejected ? "Check status" : "Refresh approval status"}</Button>}
      />
      <Typography.Paragraph type="secondary" style={{ textAlign: "center", marginBottom: 0 }}>
        {user.Tenant?.approvalStatus === "pending" ? "Hospital access will open after approval." : "If you have updated your application details, contact CareBase support."}
      </Typography.Paragraph>
    </Card>
  </div>;
}
