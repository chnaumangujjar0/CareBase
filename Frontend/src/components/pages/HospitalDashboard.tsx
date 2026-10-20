import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Alert,
  Button,
  Card,
  Col,
  ConfigProvider,
  Empty,
  Flex,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import { Activity, BedDouble, CalendarDays, ClipboardList, RefreshCw, Users } from "lucide-react";
import dayjs from "dayjs";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "react-toastify";
import { getApiErrorMessage, getDashboardMonthlyRevenue, getDashboardMonthlySales, getDashboardSummary } from "../../services/api";
import type { DashboardMonthlyRevenue, DashboardMonthlySales, DashboardSummary } from "../../types/global.types";
import PageSkeleton from "../common/PageSkeleton";
import { appTheme } from "../../theme";

const { Title, Text } = Typography;

interface HospitalDashboardProps {
  role: string;
}
export default function HospitalDashboard({ role }: HospitalDashboardProps) {
  const navigate = useNavigate();
  const isAdmin = ["owner", "admin"].includes(role.toLowerCase());
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthlySales, setMonthlySales] = useState<DashboardMonthlySales | null>(null);
  const [salesMonths, setSalesMonths] = useState<3 | 6 | 12>(6);
  const [salesPharmacyId, setSalesPharmacyId] = useState("");
  const [salesLoading, setSalesLoading] = useState(false);
  const [monthlyRevenue, setMonthlyRevenue] = useState<DashboardMonthlyRevenue | null>(null);
  const [revenueMonths, setRevenueMonths] = useState<3 | 6 | 12>(6);
  const [revenueSource, setRevenueSource] = useState<"all" | "billing" | "pharmacy">("all");
  const [revenuePaymentMethod, setRevenuePaymentMethod] = useState<"" | "cash" | "card" | "insurance">("");
  const [revenueLoading, setRevenueLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await getDashboardSummary());
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load hospital dashboard"));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMonthlySales = useCallback(async () => {
    setSalesLoading(true);
    try {
      setMonthlySales(await getDashboardMonthlySales({
        months: salesMonths,
        pharmacyId: salesPharmacyId || undefined,
      }));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load monthly pharmacy sales"));
    } finally {
      setSalesLoading(false);
    }
  }, [salesMonths, salesPharmacyId]);

  const loadMonthlyRevenue = useCallback(async () => {
    setRevenueLoading(true);
    try {
      setMonthlyRevenue(await getDashboardMonthlyRevenue({
        months: revenueMonths,
        source: revenueSource,
        paymentMethod: revenuePaymentMethod || undefined,
      }));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load monthly hospital revenue"));
    } finally {
      setRevenueLoading(false);
    }
  }, [revenueMonths, revenueSource, revenuePaymentMethod]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSummary(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSummary]);

  useEffect(() => {
    if (!isAdmin) return;
    const timer = window.setTimeout(() => void loadMonthlySales(), 0);
    return () => window.clearTimeout(timer);
  }, [isAdmin, loadMonthlySales]);

  useEffect(() => {
    if (!isAdmin) return;
    const timer = window.setTimeout(() => void loadMonthlyRevenue(), 0);
    return () => window.clearTimeout(timer);
  }, [isAdmin, loadMonthlyRevenue]);

  const appointmentColumns: TableProps<DashboardSummary["appointments"][number]>["columns"] = [
    {
      title: "DATE & TIME",
      dataIndex: "scheduledAt",
      render: (value: string) => <span>{dayjs(value).format("MMM D, h:mm A")}</span>,
    },
    {
      title: "PATIENT",
      key: "patient",
      render: (_, appointment) => (
        <div>
          <Text strong>{appointment.Patient.firstName} {appointment.Patient.lastName}</Text>
          <Text type="secondary" style={{ display: "block", fontSize: 12 }}>{appointment.Patient.mrn}</Text>
        </div>
      ),
    },
    { title: "DEPARTMENT", dataIndex: ["Department", "name"] },
    { title: "DOCTOR", dataIndex: ["DoctorProfile", "User", "name"] },
    {
      title: "STATUS",
      dataIndex: "status",
      render: (status: string) => <Tag color={status === "booked" ? "blue" : status === "completed" ? "green" : "default"}>{status.replace("_", " ")}</Tag>,
    },
  ];

  const stats = summary?.stats;
  const activityChartData = stats
    ? [
        { name: "Appointments", completed: stats.completedAppointmentsToday ?? 0, cancelled: stats.cancelledAppointmentsToday ?? 0, noShow: stats.noShowAppointmentsToday ?? 0 },
        { name: "Encounters", completed: stats.openEncountersToday ?? 0, cancelled: stats.waitingEncounters ?? 0, noShow: stats.activeAdmissions ?? 0 },
      ]
    : [];
  const cards = [
    ...(isAdmin
      ? [{ label: "Active patients", value: stats?.activePatients ?? 0, detail: `${stats?.newPatientsToday ?? 0} registered today`, icon: <Users size={20} /> }]
      : []),
    { label: "Appointments today", value: stats?.appointmentsToday ?? 0, detail: `${stats?.bookedAppointmentsToday ?? 0} booked`, icon: <CalendarDays size={20} /> },
    { label: role === "Receptionist" ? "Waiting patients" : "Open encounters today", value: role === "Receptionist" ? stats?.waitingEncounters ?? 0 : stats?.openEncountersToday ?? 0, detail: `${stats?.activeAdmissions ?? 0} active admissions`, icon: <ClipboardList size={20} /> },
    { label: "Available beds", value: stats?.availableBeds ?? 0, detail: `${stats?.occupiedBeds ?? 0} occupied of ${stats?.totalBeds ?? 0}`, icon: <BedDouble size={20} /> },
    ...(isAdmin
      ? [{ label: "Active clinical staff", value: (stats?.activeDoctors ?? 0) + (stats?.activeStaff ?? 0), detail: `${stats?.activeDoctors ?? 0} doctors · ${stats?.activeStaff ?? 0} staff`, icon: <Activity size={20} /> }]
      : []),
  ];

  return (
    <ConfigProvider theme={appTheme}>
    <div className="hospital-dashboard-page" style={{ minHeight: "100%", padding: 24, background: "#f8fafc" }}>
      <Flex justify="space-between" align="center" wrap="wrap" gap={16} style={{ marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>{role === "Receptionist" ? "Reception overview" : "Hospital overview"}</Title>
          <Text type="secondary">Live figures from your hospital records · {dayjs().format("dddd, MMMM D, YYYY")}</Text>
        </div>
        <Space>
          <Button icon={<RefreshCw size={16} />} onClick={() => { void loadSummary(); if (isAdmin) { void loadMonthlySales(); void loadMonthlyRevenue(); } }} loading={loading || salesLoading || revenueLoading}>Refresh</Button>
          <Button type="primary" onClick={() => navigate("/clinical")}>Open clinical desk</Button>
        </Space>
      </Flex>

      {loading && !summary ? (
        <PageSkeleton />
      ) : !summary ? (
        <Alert type="error" showIcon message="Dashboard data could not be loaded" description="Check your connection and refresh to try again." />
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            {cards.map((card) => (
              <Col xs={24} sm={12} xl={isAdmin ? 6 : 8} key={card.label}>
                <Card loading={loading}>
                  <Statistic title={card.label} value={card.value} prefix={card.icon} />
                  <Text type="secondary">{card.detail}</Text>
                </Card>
              </Col>
            ))}
          </Row>

          {isAdmin && <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} xl={12}>
              <Card
                loading={salesLoading}
                title="Monthly pharmacy sales"
                extra={<Space wrap>
                  <Select
                    aria-label="Sales date range"
                    value={salesMonths}
                    onChange={(value: 3 | 6 | 12) => setSalesMonths(value)}
                    options={[{ value: 3, label: "Last 3 months" }, { value: 6, label: "Last 6 months" }, { value: 12, label: "Last 12 months" }]}
                  />
                  <Select
                    aria-label="Filter sales by pharmacy"
                    value={salesPharmacyId || undefined}
                    onChange={(value: string | undefined) => setSalesPharmacyId(value ?? "")}
                    allowClear
                    placeholder="All pharmacies"
                    style={{ minWidth: 180 }}
                    options={(monthlySales?.pharmacies ?? []).map((pharmacy) => ({ value: pharmacy.id, label: pharmacy.name }))}
                  />
                </Space>}
              >
                <Flex gap={28} wrap="wrap" style={{ marginBottom: 12 }}>
                  <div><Text type="secondary">Sales in selected period</Text><div><Text strong style={{ fontSize: 20, color: "#0F766E" }}>PKR {(monthlySales?.totalSales ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text></div></div>
                  <div><Text type="secondary">Transactions</Text><div><Text strong style={{ fontSize: 20 }}>{monthlySales?.totalTransactions ?? 0}</Text></div></div>
                </Flex>
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={monthlySales?.monthlySales ?? []} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tickFormatter={(value: string) => dayjs(`${value}-01`).format("MMM YY")} />
                      <YAxis allowDecimals={false} tickFormatter={(value: number) => new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value)} />
                      <Tooltip labelFormatter={(value) => dayjs(`${value}-01`).format("MMMM YYYY")} formatter={(value) => [`PKR ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Sales"]} />
                      <Bar dataKey="sales" name="Sales" fill="#0F766E" radius={[5, 5, 0, 0]} isAnimationActive={!salesLoading} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card
                loading={revenueLoading}
                title="Monthly hospital revenue"
                extra={<Space wrap>
                  <Select
                    aria-label="Revenue date range"
                    value={revenueMonths}
                    onChange={(value: 3 | 6 | 12) => setRevenueMonths(value)}
                    options={[{ value: 3, label: "Last 3 months" }, { value: 6, label: "Last 6 months" }, { value: 12, label: "Last 12 months" }]}
                  />
                  <Select
                    aria-label="Filter revenue source"
                    value={revenueSource}
                    onChange={(value: "all" | "billing" | "pharmacy") => setRevenueSource(value)}
                    options={[{ value: "all", label: "All revenue" }, { value: "billing", label: "Billing payments" }, { value: "pharmacy", label: "Pharmacy sales" }]}
                  />
                  <Select
                    aria-label="Filter payment method"
                    value={revenuePaymentMethod || undefined}
                    onChange={(value: "cash" | "card" | "insurance" | undefined) => setRevenuePaymentMethod(value ?? "")}
                    allowClear
                    placeholder="All payment methods"
                    style={{ minWidth: 170 }}
                    options={[{ value: "cash", label: "Cash" }, { value: "card", label: "Card" }, { value: "insurance", label: "Insurance" }]}
                  />
                </Space>}
              >
                <Flex gap={28} wrap="wrap" style={{ marginBottom: 12 }}>
                  <div><Text type="secondary">Collected revenue in selected period</Text><div><Text strong style={{ fontSize: 20, color: "#0F766E" }}>PKR {(monthlyRevenue?.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text></div></div>
                  <div><Text type="secondary">Completed transactions</Text><div><Text strong style={{ fontSize: 20 }}>{monthlyRevenue?.totalTransactions ?? 0}</Text></div></div>
                </Flex>
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={monthlyRevenue?.monthlyRevenue ?? []} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tickFormatter={(value: string) => dayjs(`${value}-01`).format("MMM YY")} />
                      <YAxis allowDecimals={false} tickFormatter={(value: number) => new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value)} />
                      <Tooltip labelFormatter={(value) => dayjs(`${value}-01`).format("MMMM YYYY")} formatter={(value) => [`PKR ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, ""]} />
                      <Legend />
                      {(revenueSource === "all" || revenueSource === "billing") && <Bar dataKey="billing" name="Billing payments" stackId="revenue" fill="#0F766E" radius={[0, 0, 0, 0]} isAnimationActive={!revenueLoading} />}
                      {(revenueSource === "all" || revenueSource === "pharmacy") && <Bar dataKey="pharmacySales" name="Pharmacy sales" stackId="revenue" fill="#0284C7" radius={[5, 5, 0, 0]} isAnimationActive={!revenueLoading} />}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
          </Row>}

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <Card
                title="Upcoming appointments"
                extra={<Button type="link" onClick={() => navigate("/appointments")}>Manage appointments</Button>}
              >
                <Table
                  rowKey="id"
                  columns={appointmentColumns}
                  dataSource={summary.appointments}
                  loading={loading}
                  pagination={{ pageSize: 8, showSizeChanger: false }}
                  locale={{ emptyText: <Empty description="No upcoming appointments scheduled" /> }}
                  scroll={{ x: 640 }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="Today's activity" style={{ height: "100%" }}>
                <Space direction="vertical" size="large" style={{ width: "100%" }}>
                  <div>
                    <Text type="secondary">Appointment status</Text>
                    <Flex justify="space-between"><Text>Completed</Text><Text strong>{stats?.completedAppointmentsToday ?? 0}</Text></Flex>
                    <Flex justify="space-between"><Text>Cancelled</Text><Text strong>{stats?.cancelledAppointmentsToday ?? 0}</Text></Flex>
                    <Flex justify="space-between"><Text>No-show</Text><Text strong>{stats?.noShowAppointmentsToday ?? 0}</Text></Flex>
                  </div>
                  <div>
                    <Text type="secondary">Care queue</Text>
                    <Flex justify="space-between"><Text>Waiting</Text><Text strong>{stats?.waitingEncounters ?? 0}</Text></Flex>
                    <Flex justify="space-between"><Text>Open today</Text><Text strong>{stats?.openEncountersToday ?? 0}</Text></Flex>
                    <Flex justify="space-between"><Text>Active admissions</Text><Text strong>{stats?.activeAdmissions ?? 0}</Text></Flex>
                  </div>
                  <Button block onClick={() => navigate("/clinical")}>View patient queue</Button>
                </Space>
              </Card>
            </Col>
            <Col xs={24}>
              <Card title="Operational trends">
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={activityChartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completed" name="Completed / open" fill="#0F766E" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cancelled" name="Cancelled / waiting" fill="#D97706" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="noShow" name="No-show / admissions" fill="#0284C7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
          </Row>
          <Text type="secondary" style={{ display: "block", marginTop: 12, textAlign: "right" }}>
            Updated {dayjs(summary.generatedAt).format("h:mm:ss A")}
          </Text>
        </>
      )}
    </div>
    </ConfigProvider>
  );
}
