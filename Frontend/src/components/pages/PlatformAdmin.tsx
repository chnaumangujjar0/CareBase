import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Input, Modal, Row, Select, Space, Spin, Statistic, Table, Tag, Typography } from "antd";
import type { TableProps } from "antd";
import { Check, LogOut, RefreshCw, X } from "lucide-react";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import Logo from "../../assets/carebase-logo-full.svg";
import { clearUser, selectCurrentUser } from "../../store/authSlice";
import { clearTenant } from "../../store/tenantSlice";
import "../../styles/platformAdmin.scss";
import type { PlatformTenant } from "../../types/auth";
import { getApiErrorMessage, getPlatformTenants, logoutUser, updatePlatformTenantApproval } from "../../services/api";

const { Title, Text } = Typography;
type ApprovalFilter = "all" | "pending" | "approved" | "rejected";

export default function PlatformAdmin() {
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ApprovalFilter>("all");
  const [search, setSearch] = useState("");
  const [rejectingTenant, setRejectingTenant] = useState<PlatformTenant | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not contact the server. Your local session was cleared."));
    } finally {
      dispatch(clearUser());
      dispatch(clearTenant());
      navigate("/login", { replace: true });
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTenants(await getPlatformTenants());
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load hospital applications"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const decide = async (tenant: PlatformTenant, status: "pending" | "approved" | "rejected", note?: string) => {
    setSavingId(tenant.id);
    try {
      await updatePlatformTenantApproval(tenant.id, { status, ...(note ? { note } : {}) });
      toast.success(status === "pending" ? "Application returned to pending" : `Hospital ${status}`);
      setRejectingTenant(null);
      setRejectionNote("");
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not update hospital approval"));
    } finally {
      setSavingId(null);
    }
  };

  const counts = useMemo(() => ({
    total: tenants.length,
    pending: tenants.filter((tenant) => tenant.approvalStatus === "pending").length,
    approved: tenants.filter((tenant) => tenant.approvalStatus === "approved").length,
    rejected: tenants.filter((tenant) => tenant.approvalStatus === "rejected").length,
  }), [tenants]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tenants.filter((tenant) => (filter === "all" || tenant.approvalStatus === filter)
      && (!term || [tenant.name, tenant.city, tenant.country, tenant.User[0]?.name, tenant.User[0]?.email].some((value) => value?.toLowerCase().includes(term))));
  }, [filter, search, tenants]);

  const columns: TableProps<PlatformTenant>["columns"] = [
    { title: "HOSPITAL", key: "hospital", render: (_, tenant) => <Space direction="vertical" size={0}><Text strong>{tenant.name}</Text><Text type="secondary">{tenant.city || tenant.country || "Location not provided"}</Text></Space> },
    { title: "OWNER", key: "owner", render: (_, tenant) => tenant.User[0] ? <Space direction="vertical" size={0}><Text>{tenant.User[0].name}</Text><Text type="secondary">{tenant.User[0].email}</Text></Space> : <Text type="secondary">Owner unavailable</Text> },
    { title: "REGISTERED", dataIndex: "createdAt", render: (value: string) => dayjs(value).format("MMM D, YYYY") },
    { title: "USERS / PATIENTS", key: "counts", render: (_, tenant) => `${tenant._count.User} / ${tenant._count.Patient}` },
    { title: "STATUS", dataIndex: "approvalStatus", render: (status: PlatformTenant["approvalStatus"]) => <Tag color={status === "approved" ? "green" : status === "pending" ? "gold" : "red"}>{status.toUpperCase()}</Tag> },
    { title: "REVIEW NOTE", dataIndex: "approvalNote", render: (note?: string | null) => note || "—" },
    { title: "ACTIONS", key: "actions", render: (_, tenant) => <Space wrap>{tenant.approvalStatus === "pending" ? <><Button size="small" type="primary" icon={<Check size={14} />} loading={savingId === tenant.id} onClick={() => void decide(tenant, "approved")}>Approve</Button><Button size="small" danger icon={<X size={14} />} onClick={() => { setRejectingTenant(tenant); setRejectionNote(""); }}>Reject</Button></> : <Button size="small" onClick={() => void decide(tenant, "pending")} loading={savingId === tenant.id}>Return to pending</Button>}</Space> },
  ];

  return <>
    <header className="top-header platform-admin-header">
      <div className="header-brand"><img src={Logo} alt="CareBase" className="header-logo" /><span className="platform-admin-header__label">Platform administration</span></div>
      <div className="platform-admin-header__actions"><div className="platform-admin-header__identity"><span>{user?.name}</span><small>Super administrator</small></div><Button danger icon={<LogOut size={16} />} onClick={() => void handleLogout()}>Log out</Button></div>
    </header>
    <div className="platform-admin-page" style={{ padding: 24, minHeight: "100vh", background: "#F1F5F9" }}>
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Row align="middle" justify="space-between" gutter={[16, 16]}>
        <Col><Title level={2} style={{ margin: 0 }}>CareBase platform</Title><Text type="secondary">Review hospital registrations and manage approval status.</Text></Col>
        <Col><Button icon={<RefreshCw size={15} />} onClick={() => void load()} loading={loading}>Refresh</Button></Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><Card><Statistic title="All hospitals" value={counts.total} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Pending review" value={counts.pending} valueStyle={{ color: counts.pending ? "#D97706" : undefined }} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Approved" value={counts.approved} valueStyle={{ color: "#16A34A" }} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Rejected" value={counts.rejected} valueStyle={{ color: counts.rejected ? "#DC2626" : undefined }} /></Card></Col>
      </Row>
      <Card title="Hospital registrations" extra={<Space wrap><Input.Search allowClear placeholder="Search hospital or owner" onChange={(event) => setSearch(event.target.value)} style={{ width: 240 }} /><Select value={filter} onChange={setFilter} style={{ width: 150 }} options={[{ value: "all", label: "All hospitals" }, { value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }]} /></Space>}>
        <Table<PlatformTenant> rowKey="id" loading={loading} dataSource={rows} columns={columns} scroll={{ x: 1050 }} pagination={{ pageSize: 10, showSizeChanger: true }} locale={{ emptyText: loading ? <Spin /> : "No hospitals match this filter." }} />
      </Card>
    </Space>
    <Modal title={`Reject ${rejectingTenant?.name ?? "hospital"}`} open={Boolean(rejectingTenant)} okText="Reject application" okButtonProps={{ danger: true, disabled: !rejectionNote.trim(), loading: Boolean(rejectingTenant && savingId === rejectingTenant.id) }} onCancel={() => setRejectingTenant(null)} onOk={() => rejectingTenant && void decide(rejectingTenant, "rejected", rejectionNote.trim())}>
      <Text type="secondary">Give the hospital owner a reason so they know why the application was rejected.</Text>
      <Input.TextArea value={rejectionNote} onChange={(event) => setRejectionNote(event.target.value)} rows={4} maxLength={2000} showCount style={{ marginTop: 16 }} placeholder="Reason for rejection" />
    </Modal>
    </div>
  </>;
}
