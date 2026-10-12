import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import { Activity, BedDouble, CalendarDays, ClipboardList, RefreshCw, Users } from "lucide-react";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { getApiErrorMessage, getDashboardSummary } from "../../services/api";
import type { DashboardSummary } from "../../types/global.types";

const { Title, Text } = Typography;

interface HospitalDashboardProps {
  role: string;
}

export default function HospitalDashboard({ role }: HospitalDashboardProps) {
  const navigate = useNavigate();
  const isAdmin = ["owner", "admin"].includes(role.toLowerCase());
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSummary(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSummary]);

  const appointmentColumns: TableProps<DashboardSummary["appointments"][number]>["columns"] = [
    {
      title: "TIME",
      dataIndex: "scheduledAt",
      render: (value: string) => dayjs(value).format("h:mm A"),
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
    <div style={{ minHeight: "100%", padding: 24, background: "#f8fafc" }}>
      <Flex justify="space-between" align="center" wrap="wrap" gap={16} style={{ marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>{role === "Receptionist" ? "Reception overview" : "Hospital overview"}</Title>
          <Text type="secondary">Live figures from your hospital records · {dayjs().format("dddd, MMMM D, YYYY")}</Text>
        </div>
        <Space>
          <Button icon={<RefreshCw size={16} />} onClick={() => void loadSummary()} loading={loading}>Refresh</Button>
          <Button type="primary" onClick={() => navigate("/clinical")}>Open clinical desk</Button>
        </Space>
      </Flex>

      {loading && !summary ? (
        <Flex justify="center" style={{ padding: 80 }}><Spin size="large" /></Flex>
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

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <Card
                title={role === "Receptionist" ? "Today's appointment schedule" : "Today's appointments"}
                extra={<Button type="link" onClick={() => navigate("/appointments")}>Manage appointments</Button>}
              >
                <Table
                  rowKey="id"
                  columns={appointmentColumns}
                  dataSource={summary.appointments}
                  loading={loading}
                  pagination={{ pageSize: 8, showSizeChanger: false }}
                  locale={{ emptyText: <Empty description="No appointments scheduled today" /> }}
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
          </Row>
          <Text type="secondary" style={{ display: "block", marginTop: 12, textAlign: "right" }}>
            Updated {dayjs(summary.generatedAt).format("h:mm:ss A")}
          </Text>
        </>
      )}
    </div>
  );
}
