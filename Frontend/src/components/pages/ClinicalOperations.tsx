import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  Space,
  Switch,
  Select,
  Table,
  Tabs,
  Tag,
  Typography,
  ConfigProvider
} from "antd";
import type { TableProps } from "antd";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { selectCurrentUser } from "../../store/authSlice";
import type { AuthUser } from "../../types/auth";
import type {
  ClinicalAdmission,
  ClinicalSurgeryCase,
} from "../../types/global.types";
import {
  type ClinicalTheatre,
  createClinicalTheatre,
  getApiErrorMessage,
  getClinicalAdmissions,
  getClinicalSurgeries,
  getClinicalTheatres,
  updateClinicalSurgery,
  updateClinicalTheatre,
} from "../../services/api";

const { Title, Text } = Typography;

interface TheatreFormValues {
  name: string;
}

type AdmissionFilter = "admitted" | "discharged" | "all";
type SurgeryStatus = ClinicalSurgeryCase["status"];

const nextSurgeryStatuses: Record<SurgeryStatus, SurgeryStatus[]> = {
  scheduled: ["in_progress", "cancelled", "postponed"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
  postponed: ["cancelled"],
};


const themeConfig = {
  token: {
    colorPrimary: '#0F766E',
    colorInfo: '#0284C7',
    colorSuccess: '#16A34A',
    colorWarning: '#D97706',
    colorError: '#DC2626',
    colorTextBase: '#1E293B',
    colorBgLayout: '#F1F5F9',
    borderRadius: 8,
    fontFamily: '"Inter", sans-serif',
    boxShadowTertiary: '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.06)',
  },
};

export default function ClinicalOperations() {
  const user = useSelector(selectCurrentUser) as AuthUser | null;
  const navigate = useNavigate();
  const [admissions, setAdmissions] = useState<ClinicalAdmission[]>([]);
  const [admissionPage, setAdmissionPage] = useState(1);
  const [admissionTotal, setAdmissionTotal] = useState(0);
  const [admissionFilter, setAdmissionFilter] = useState<AdmissionFilter>("admitted");
  const [surgeries, setSurgeries] = useState<ClinicalSurgeryCase[]>([]);
  const [surgeryPage, setSurgeryPage] = useState(1);
  const [surgeryTotal, setSurgeryTotal] = useState(0);
  const [surgeryStatusChanges, setSurgeryStatusChanges] = useState<Record<string, SurgeryStatus>>({});
  const [theatres, setTheatres] = useState<ClinicalTheatre[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [theatreForm] = Form.useForm<TheatreFormValues>();

  const hasPermission = useCallback((permission: string) =>
    Boolean(user?.permissions?.includes("*") || user?.permissions?.includes(permission)), [user?.permissions]);
  const canReadAdmissions = hasPermission("clinical:admissions:read");
  const canReadSurgeries = hasPermission("clinical:surgeries:read");
  const canReadTheatres = canReadSurgeries;
  const canManageTheatre = ["owner", "admin"].includes(user?.role?.toLowerCase() ?? "")
    && hasPermission("clinical:surgeries:write");

  const load = useCallback(async () => {
    setLoading(true);
    const errors: string[] = [];
    const tasks: Promise<void>[] = [];
    if (canReadAdmissions) {
      tasks.push(getClinicalAdmissions({
        ...(admissionFilter === "all" ? {} : { status: admissionFilter }),
        page: admissionPage,
        limit: 25,
      })
        .then((result) => {
          setAdmissions(result.items);
          setAdmissionTotal(result.pagination.total);
        })
        .catch((error: unknown) => { errors.push(getApiErrorMessage(error, "Could not load active admissions")); }));
    }
    if (canReadSurgeries) {
      tasks.push(getClinicalSurgeries({ page: surgeryPage, limit: 25 })
        .then((result) => {
          setSurgeries(result.items);
          setSurgeryTotal(result.pagination.total);
        })
        .catch((error: unknown) => { errors.push(getApiErrorMessage(error, "Could not load surgery schedule")); }));
      tasks.push(getClinicalTheatres(includeInactive)
        .then(setTheatres)
        .catch((error: unknown) => { errors.push(getApiErrorMessage(error, "Could not load operating theatres")); }));
    }
    await Promise.all(tasks);
    errors.forEach((message) => toast.error(message));
    setLoading(false);
  }, [admissionFilter, admissionPage, canReadAdmissions, canReadSurgeries, includeInactive, surgeryPage]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const addTheatre = async (values: TheatreFormValues) => {
    setSaving(true);
    try {
      await createClinicalTheatre(values.name.trim());
      toast.success("Operating theatre added");
      theatreForm.resetFields();
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not add operating theatre"));
    } finally {
      setSaving(false);
    }
  };

  const toggleTheatre = async (theatre: ClinicalTheatre, isActive: boolean) => {
    try {
      await updateClinicalTheatre(theatre.id, { isActive });
      toast.success(isActive ? "Theatre reactivated" : "Theatre deactivated");
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not update operating theatre"));
    }
  };

  const saveSurgeryStatus = async (surgery: ClinicalSurgeryCase) => {
    const status = surgeryStatusChanges[surgery.id];
    if (!status || status === surgery.status) return;
    setSaving(true);
    try {
      await updateClinicalSurgery(surgery.id, { status, version: surgery.version });
      toast.success("Surgery case updated");
      setSurgeryStatusChanges((current) => {
        const next = { ...current };
        delete next[surgery.id];
        return next;
      });
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not update surgery case"));
    } finally {
      setSaving(false);
    }
  };

  const admissionColumns: TableProps<ClinicalAdmission>["columns"] = [
    {
      title: "PATIENT",
      key: "patient",
      render: (_, admission) => (
        <div>
          <Text strong>{admission.Encounter?.Patient.firstName} {admission.Encounter?.Patient.lastName}</Text>
          <Text type="secondary" style={{ display: "block" }}>{admission.Encounter?.Patient.mrn}</Text>
        </div>
      ),
    },
    { title: "DEPARTMENT", dataIndex: ["Encounter", "Department", "name"] },
    {
      title: "ADMITTED",
      dataIndex: "admittedAt",
      render: (value: string) => dayjs(value).format("MMM D, YYYY h:mm A"),
    },
    {
      title: "BED",
      key: "bed",
      render: (_, admission) => admission.BedAssignment.length
        ? admission.BedAssignment.map(({ id, Bed, releasedAt }) => (
          <Tag key={id} color={releasedAt ? "default" : "green"}>
            {Bed.code} · {Bed.Room?.Ward?.name ?? "Ward"}{releasedAt ? " (released)" : " (current)"}
          </Tag>
        ))
        : "—",
    },
    {
      title: "DISCHARGED",
      dataIndex: "dischargedAt",
      render: (value?: string | null) => value ? dayjs(value).format("MMM D, YYYY h:mm A") : "—",
    },
    {
      title: "OUTCOME",
      dataIndex: "dischargeType",
      render: (value?: string | null) => value?.replaceAll("_", " ") ?? "—",
    },
    {
      title: "FINAL DIAGNOSIS",
      dataIndex: ["DischargeSummary", "finalDiagnosis"],
      render: (value?: string | null) => value || "—",
    },
    {
      title: "ADMITTING DOCTOR",
      dataIndex: ["AdmittingDoctor", "User", "name"],
      render: (name?: string) => name ?? "—",
    },
    {
      title: "",
      key: "actions",
      render: (_, admission) => hasPermission("clinical:encounters:read") ? (
        <Button
          type="link"
          onClick={() => navigate(`/clinical?encounterId=${admission.Encounter?.id}`)}
          disabled={!admission.Encounter?.id}
        >
          Open encounter
        </Button>
      ) : null,
    },
  ];

  const surgeryColumns: TableProps<ClinicalSurgeryCase>["columns"] = [
    {
      title: "PATIENT / PROCEDURE",
      key: "procedure",
      render: (_, surgery) => (
        <div>
          <Text strong>{surgery.procedureName}</Text>
          <Text type="secondary" style={{ display: "block" }}>
            {surgery.Encounter?.Patient.firstName} {surgery.Encounter?.Patient.lastName} · {surgery.Encounter?.Patient.mrn}
          </Text>
        </div>
      ),
    },
    { title: "SCHEDULED", dataIndex: "scheduledAt", render: (value: string) => dayjs(value).format("MMM D, YYYY h:mm A") },
    { title: "THEATRE", dataIndex: ["OperatingTheatre", "name"] },
    { title: "SURGEON", dataIndex: ["Surgeon", "User", "name"] },
    { title: "STATUS", dataIndex: "status", render: (status: ClinicalSurgeryCase["status"]) => <Tag>{status.replace("_", " ")}</Tag> },
    {
      title: "TEAM",
      key: "team",
      render: (_, surgery) => surgery.SurgeryTeamMember.length
        ? surgery.SurgeryTeamMember.map(({ id, User: teamUser, role }) => <Tag key={id}>{teamUser?.name ?? role}</Tag>)
        : "—",
    },
    ...(hasPermission("clinical:encounters:read") ? [{
      title: "",
      key: "actions",
      render: (_: unknown, surgery: ClinicalSurgeryCase) => (
        <Button type="link" onClick={() => navigate(`/clinical?encounterId=${surgery.Encounter?.id}`)}>
          Open encounter
        </Button>
      ),
    }] : []),
    ...(hasPermission("clinical:surgeries:write") ? [{
      title: "UPDATE STATUS",
      key: "updateStatus",
      render: (_: unknown, surgery: ClinicalSurgeryCase) => {
        const options = nextSurgeryStatuses[surgery.status];
        if (!options.length) return "—";
        const selected = surgeryStatusChanges[surgery.id];
        return (
          <Space>
            <Select
              value={selected}
              placeholder="Change status"
              onChange={(status: SurgeryStatus) => setSurgeryStatusChanges((current) => ({ ...current, [surgery.id]: status }))}
              options={options.map((status) => ({ value: status, label: status.replace("_", " ") }))}
              style={{ minWidth: 140 }}
            />
            <Button
              type="primary"
              size="small"
              loading={saving}
              disabled={!selected}
              onClick={() => void saveSurgeryStatus(surgery)}
            >
              Save
            </Button>
          </Space>
        );
      },
    }] : []),
  ];

  const theatreColumns: TableProps<ClinicalTheatre>["columns"] = [
    { title: "THEATRE", dataIndex: "name", render: (name: string) => <Text strong>{name}</Text> },
    { title: "STATUS", dataIndex: "isActive", render: (isActive: boolean) => <Tag color={isActive ? "green" : "default"}>{isActive ? "Active" : "Inactive"}</Tag> },
    ...(canManageTheatre ? [{
      title: "ACTIVE",
      dataIndex: "isActive",
      render: (isActive: boolean, theatre: ClinicalTheatre) => (
        <Switch checked={isActive} onChange={(checked) => void toggleTheatre(theatre, checked)} />
      ),
    }] : []),
  ];

  const tabs = [
    ...(canReadAdmissions ? [{
      key: "admissions",
      label: `Admissions (${admissionTotal})`,
      children: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Select
            value={admissionFilter}
            onChange={(value: AdmissionFilter) => {
              setAdmissionFilter(value);
              setAdmissionPage(1);
            }}
            options={[
              { value: "admitted", label: "Currently admitted" },
              { value: "discharged", label: "Discharged" },
              { value: "all", label: "All admissions" },
            ]}
            style={{ width: 220 }}
          />
          <Table<ClinicalAdmission>
            rowKey="id"
            columns={admissionColumns}
            dataSource={admissions}
            loading={loading}
            pagination={{ current: admissionPage, pageSize: 25, total: admissionTotal, onChange: setAdmissionPage }}
            expandable={{
              expandedRowRender: (admission) => admission.DischargeSummary ? (
                <Descriptions size="small" column={2} title="Discharge summary">
                  <Descriptions.Item label="Final diagnosis">{admission.DischargeSummary.finalDiagnosis || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Procedures performed">{admission.DischargeSummary.proceduresPerformed || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Course in hospital" span={2}>{admission.DischargeSummary.courseInHospital || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Condition at discharge">{admission.DischargeSummary.conditionAtDischarge || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Follow-up date">
                    {admission.DischargeSummary.followUpDate
                      ? dayjs(admission.DischargeSummary.followUpDate).format("MMM D, YYYY")
                      : "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Follow-up instructions" span={2}>{admission.DischargeSummary.followUpInstructions || "—"}</Descriptions.Item>
                </Descriptions>
              ) : (
                <Text type="secondary">No discharge summary has been recorded.</Text>
              ),
            }}
            locale={{ emptyText: <Empty description="No admissions found" /> }}
          />
        </Space>
      ),
    }] : []),
    ...(canReadSurgeries ? [{
      key: "surgeries",
      label: `Surgery schedule (${surgeryTotal})`,
      children: <Table<ClinicalSurgeryCase> rowKey="id" columns={surgeryColumns} dataSource={surgeries} loading={loading} pagination={{ current: surgeryPage, pageSize: 25, total: surgeryTotal, onChange: setSurgeryPage }} locale={{ emptyText: <Empty description="No surgery cases scheduled" /> }} />,
    }] : []),
    ...(canReadTheatres ? [{
      key: "theatres",
      label: "Operating theatres",
      children: (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {canManageTheatre && (
            <Space align="center">
              <Switch checked={includeInactive} onChange={setIncludeInactive} />
              <Text>Show inactive theatres</Text>
            </Space>
          )}
          <Card title="Operating theatres">
            {canManageTheatre && (
              <Form form={theatreForm} layout="inline" onFinish={(values) => void addTheatre(values)}>
                <Form.Item name="name" rules={[{ required: true }]}><Input placeholder="Operating theatre name" maxLength={120} /></Form.Item>
                <Form.Item><Button type="primary" htmlType="submit" loading={saving}>Add theatre</Button></Form.Item>
              </Form>
            )}
            <Table<ClinicalTheatre> rowKey="id" columns={theatreColumns} dataSource={theatres} loading={loading} pagination={{ pageSize: 8 }} />
          </Card>
        </Space>
      ),
    }] : []),
  ];

  return (
    <ConfigProvider theme={themeConfig}>
    <div style={{ padding: 24, background: "#f8fafc", minHeight: "100%" }}>
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Clinical operations</Title>
          <Text type="secondary">Manage inpatient census, surgery schedules, and operating theatres.</Text>
        </div>
        <Button onClick={() => void load()} loading={loading}>Refresh</Button>
      </Space>
      {!tabs.length ? (
        <Alert type="warning" showIcon message="Your role has no clinical operations access." description="Ask a hospital administrator to grant the required clinical read permissions." />
      ) : (
        <Card><Tabs items={tabs} /></Card>
      )}
    </div>
    </ConfigProvider>
  );
}
