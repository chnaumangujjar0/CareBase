import { useEffect, useMemo, useState } from "react";
import { Alert, Avatar, Button, Card, Col, DatePicker, Flex, Form, Grid, Input, Modal, Row, Select, Space, Statistic, Switch, Table, Tag, Typography } from "antd";
import type { TableProps } from "antd";
import { Edit2, KeyRound, Plus, Search, UsersRound, UserCheck, UserX, UserRoundX, Stethoscope, Building2 } from "lucide-react";
import { toast } from "react-toastify";
import { createStaffProfile, getAllStaff, getApiErrorMessage, getDepartments, getGrantableStaffRoles, getHrDashboard, grantStaffSystemAccess, updateStaffProfile } from "../../services/api";
import type { Department, GrantStaffSystemAccessPayload, HrDashboardSummary, StaffDirectoryEntry, CreateStaffProfilePayload } from "../../types/global.types";
import { appTheme } from "../../theme";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../../store/authSlice";
import type { AuthUser } from "../../types/auth";
import dayjs from "dayjs";
import PageSkeleton from "../common/PageSkeleton";

const { Title, Text } = Typography;
const themeTokens = appTheme.token!;

const emptySummary: HrDashboardSummary = {
  totalEmployees: 0,
  activeEmployees: 0,
  inactiveEmployees: 0,
  staffWithoutSystemAccess: 0,
  doctors: 0,
  departments: 0,
};

export default function HrDashboard() {
  const screens = Grid.useBreakpoint();
  const [summary, setSummary] = useState<HrDashboardSummary>(emptySummary);
  const [employees, setEmployees] = useState<StaffDirectoryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<StaffDirectoryEntry | null>(null);
  const [grantingEmployee, setGrantingEmployee] = useState<StaffDirectoryEntry | null>(null);
  const [updating, setUpdating] = useState(false);
  const [granting, setGranting] = useState(false);
  const [grantRoleOptions, setGrantRoleOptions] = useState<GrantStaffSystemAccessPayload["role"][]>([]);
  const [grantRolesLoading, setGrantRolesLoading] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [accountForm] = Form.useForm();
  const user = useSelector(selectCurrentUser) as AuthUser | null;

  useEffect(() => {
    let active = true;
    Promise.all([getHrDashboard(), getAllStaff()])
      .then(([dashboard, directory]) => {
        if (!active) return;
        setSummary(dashboard);
        setEmployees(directory);
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = getApiErrorMessage(error, "Could not load HR dashboard");
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!user?.tenantId) return;
    let active = true;
    getDepartments(user.tenantId)
      .then((records: Department[]) => {
        if (active) setDepartments(records.filter((department) => department.isActive));
      })
      .catch((error: unknown) => {
        if (active) toast.error(getApiErrorMessage(error, "Could not load departments"));
      })
      .finally(() => {
        if (active) setDepartmentsLoading(false);
      });
    return () => { active = false; };
  }, [user?.tenantId]);

  const refreshHrData = async () => {
    try {
      const [dashboard, directory] = await Promise.all([getHrDashboard(), getAllStaff()]);
      setSummary(dashboard);
      setEmployees(directory);
      setLoadError("");
    } catch (error) {
      toast.error(`Saved successfully, but the directory could not refresh: ${getApiErrorMessage(error, "Refresh failed")}`);
    }
  };

  const addPersonnelRecord = async (values: {
    name: string;
    employeeId: string;
    departmentId: string;
    designation: string;
    phone?: string;
    joiningDate?: dayjs.ConfigType | null;
  }) => {
    setSaving(true);
    const payload: CreateStaffProfilePayload = {
      type: "Staff",
      hasSystemAccess: false,
      name: values.name.trim(),
      employeeId: values.employeeId.trim(),
      departmentId: values.departmentId,
      designation: values.designation.trim(),
      phone: values.phone?.trim() ?? "",
      joiningDate: values.joiningDate ? dayjs(values.joiningDate).toISOString() : undefined,
      isActive: true,
      availability: [],
    };
    try {
      await createStaffProfile(payload);
      setAddModalOpen(false);
      form.resetFields();
      toast.success("Employee added to the staff directory");
      await refreshHrData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not add employee"));
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (employee: StaffDirectoryEntry) => {
    setEditingEmployee(employee);
    editForm.setFieldsValue({
      name: employee.name,
      employeeId: employee.employeeId,
      designation: employee.role,
      departmentId: employee.departmentId,
      phone: employee.phone,
      isActive: employee.isActive ?? true,
      joiningDate: employee.joiningDate ? dayjs(employee.joiningDate) : null,
    });
  };

  const openGrantAccessModal = async (employee: StaffDirectoryEntry) => {
    setGrantRolesLoading(true);
    try {
      const roles = await getGrantableStaffRoles();
      if (roles.length === 0) {
        toast.error("No eligible login roles are configured. Ask an administrator to add a staff role first.");
        return;
      }
      setGrantRoleOptions(roles);
      accountForm.resetFields();
      setGrantingEmployee(employee);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load available staff roles"));
    } finally {
      setGrantRolesLoading(false);
    }
  };

  const saveEmployeeProfile = async (values: {
    name: string;
    employeeId: string;
    designation: string;
    departmentId: string;
    phone?: string;
    isActive: boolean;
    joiningDate?: dayjs.ConfigType | null;
  }) => {
    if (!editingEmployee) return;
    setUpdating(true);
    try {
      await updateStaffProfile(editingEmployee.id, {
        name: values.name.trim(),
        employeeId: values.employeeId.trim(),
        designation: values.designation.trim(),
        departmentId: values.departmentId,
        phone: values.phone?.trim() || null,
        isActive: values.isActive,
        joiningDate: values.joiningDate ? dayjs(values.joiningDate).toISOString() : null,
      });
      setEditingEmployee(null);
      toast.success("Employee profile updated");
      await refreshHrData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not update employee profile"));
    } finally {
      setUpdating(false);
    }
  };

  const provisionAccount = async (values: { email: string; password: string; confirmPassword: string; role: GrantStaffSystemAccessPayload["role"] }) => {
    if (!grantingEmployee) return;
    setGranting(true);
    try {
      const result = await grantStaffSystemAccess(grantingEmployee.id, {
        email: values.email.trim(),
        password: values.password,
        role: values.role,
      });
      setGrantingEmployee(null);
      accountForm.resetFields();
      if (result.credentialsEmail.sent) {
        toast.success(`Login account created and credentials emailed to ${result.user.email}`);
      } else {
        toast.warning("Login account created, but the credentials email could not be sent. Check the email service configuration and contact the employee securely.");
      }
      await refreshHrData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not create employee login"));
    } finally {
      setGranting(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter((employee) =>
      [employee.name, employee.role, employee.email, employee.phone]
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }, [employees, search]);

  const columns: TableProps<StaffDirectoryEntry>["columns"] = [
    {
      title: "Employee",
      key: "employee",
      render: (_, employee) => (
        <Space size={12}>
          <Avatar src={employee.image}>{employee.name.slice(0, 1).toUpperCase()}</Avatar>
          <div>
            <Text strong>{employee.name}</Text>
            <Text type="secondary" style={{ display: "block", fontSize: 12 }}>{employee.email || "No email on file"}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Designation",
      dataIndex: "role",
      key: "designation",
      render: (role: string, employee) => <Tag color={employee.type === "Doctor" ? "blue" : "cyan"}>{role}</Tag>,
    },
    {
      title: "Employee type",
      dataIndex: "type",
      key: "type",
    },
    {
      title: "Department",
      dataIndex: "departmentName",
      key: "departmentName",
      render: (department: string) => department || "Unassigned",
    },
    {
      title: "System access",
      key: "access",
      render: (_, employee) => employee.type === "Doctor" || employee.hasSystemAccess
        ? <Tag color="green">Enabled</Tag>
        : <Tag>No login</Tag>,
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean) => isActive ? <Tag color="green">Active</Tag> : <Tag color="default">Inactive</Tag>,
    },
    {
      title: "Contact",
      dataIndex: "phone",
      key: "phone",
      render: (phone: string) => phone || <Text type="secondary">Not provided</Text>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, employee) => employee.type !== "Staff" ? <Text type="secondary">Managed by admin</Text> : (
        <Space wrap size={[4, 6]}>
          <Button size="small" icon={<Edit2 size={14} />} onClick={() => openEditModal(employee)}>Edit</Button>
          {!employee.hasSystemAccess && <Button size="small" type="primary" ghost icon={<KeyRound size={14} />} loading={grantRolesLoading} onClick={() => void openGrantAccessModal(employee)}>Grant login</Button>}
        </Space>
      ),
    },
  ];

  if (loading) return <PageSkeleton />;

  return (
    <div style={{ padding: 24, minHeight: "100%", background: themeTokens.colorBgLayout, color: themeTokens.colorTextBase, fontFamily: themeTokens.fontFamily }}>
      <Space direction="vertical" size={20} style={{ display: "flex" }}>
        <div>
          <Text type="secondary">People and workforce</Text>
          <Title level={2} style={{ margin: "4px 0 0" }}>HR Dashboard</Title>
          <Text type="secondary">Employee overview and staff directory for your hospital.</Text>
        </div>

        {loadError && <Alert type="error" showIcon message="Some HR data could not be loaded" description={loadError} />}

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} xl={6}><Card><Statistic title="Total employees" value={summary.totalEmployees} prefix={<UsersRound size={18} />} /></Card></Col>
          <Col xs={24} sm={12} xl={6}><Card><Statistic title="Active employees" value={summary.activeEmployees} prefix={<UserCheck size={18} />} valueStyle={{ color: themeTokens.colorSuccess }} /></Card></Col>
          <Col xs={24} sm={12} xl={6}><Card><Statistic title="Inactive employees" value={summary.inactiveEmployees} prefix={<UserX size={18} />} valueStyle={{ color: themeTokens.colorWarning }} /></Card></Col>
          <Col xs={24} sm={12} xl={6}><Card><Statistic title="Personnel without login" value={summary.staffWithoutSystemAccess} prefix={<UserRoundX size={18} />} /></Card></Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card><Statistic title="Doctors" value={summary.doctors} prefix={<Stethoscope size={18} />} /></Card>
          </Col>
          <Col xs={24} md={12}>
            <Card><Statistic title="Departments" value={summary.departments} prefix={<Building2 size={18} />} /></Card>
          </Col>
        </Row>

        <Card>
          <Flex justify="space-between" align="center" wrap="wrap" gap={12} style={{ marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>Employee directory</Title>
            <Flex wrap="wrap" gap={8} style={{ width: screens.md ? undefined : "100%" }}>
              <Input
                allowClear
                prefix={<Search size={16} />}
                placeholder="Search employees"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                style={{ width: screens.md ? 260 : "100%", maxWidth: "100%" }}
              />
              <Button type="primary" icon={<Plus size={16} />} onClick={() => setAddModalOpen(true)}>
                Add employee
              </Button>
            </Flex>
          </Flex>
          <Table<StaffDirectoryEntry>
            rowKey="id"
            columns={columns}
            dataSource={filteredEmployees}
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 20, 50] }}
            scroll={{ x: 960 }}
            locale={{ emptyText: loadError ? "Directory is unavailable" : "No employees found" }}
          />
        </Card>
      </Space>

      <Modal
        title="Add personnel record"
        open={addModalOpen}
        onCancel={() => { setAddModalOpen(false); form.resetFields(); }}
        onOk={() => void form.submit()}
        confirmLoading={saving}
        okText="Add employee"
        destroyOnHidden
        width={screens.md ? 520 : "calc(100vw - 24px)"}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 18 }}
          message="This creates a personnel record only. No login account or password will be created."
        />
        <Form form={form} layout="vertical" onFinish={(values) => void addPersonnelRecord(values)}>
          <Form.Item name="name" label="Full name" rules={[{ required: true }, { min: 2 }]}>
            <Input placeholder="Employee name" />
          </Form.Item>
          <Form.Item name="employeeId" label="Employee ID" rules={[{ required: true }]}>
            <Input placeholder="e.g. EMP-1042" />
          </Form.Item>
          <Form.Item name="designation" label="Designation" rules={[{ required: true }]}>
            <Input placeholder="e.g. Security Guard, Sweeper" />
          </Form.Item>
          <Form.Item name="departmentId" label="Department" rules={[{ required: true, message: "Select a department" }]}>
            <Select
              placeholder="Select department"
              options={departments.map((department) => ({ label: department.name, value: department.id }))}
              loading={departmentsLoading}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="joiningDate" label="Joining date"><DatePicker style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="phone" label="Phone number">
            <Input placeholder="Optional" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Edit ${editingEmployee?.name ?? "employee"}`}
        open={Boolean(editingEmployee)}
        onCancel={() => setEditingEmployee(null)}
        onOk={() => void editForm.submit()}
        confirmLoading={updating}
        okText="Save changes"
        destroyOnHidden
        width={screens.md ? 560 : "calc(100vw - 24px)"}
      >
        <Form form={editForm} layout="vertical" onFinish={(values) => void saveEmployeeProfile(values)}>
          <Form.Item name="name" label="Full name" rules={[{ required: true }, { min: 2 }]}><Input /></Form.Item>
          <Form.Item name="employeeId" label="Employee ID" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="designation" label="Designation" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="departmentId" label="Department" rules={[{ required: true, message: "Select a department" }]}>
            <Select
              placeholder="Select department"
              options={departments.map((department) => ({ label: department.name, value: department.id }))}
              loading={departmentsLoading}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="phone" label="Phone number"><Input /></Form.Item>
          <Form.Item name="joiningDate" label="Joining date"><DatePicker style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="isActive" label="Employment status" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Grant system access${grantingEmployee ? ` to ${grantingEmployee.name}` : ""}`}
        open={Boolean(grantingEmployee)}
        onCancel={() => { setGrantingEmployee(null); accountForm.resetFields(); }}
        onOk={() => void accountForm.submit()}
        confirmLoading={granting}
        okText="Create login"
        destroyOnHidden
        width={screens.md ? 520 : "calc(100vw - 24px)"}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 18 }}
          message="Choose a standard staff role and set an initial password. The employee will use these credentials to sign in."
          description="HR can assign non-administrator roles only. Share the password securely; it is stored as a hash and cannot be viewed again."
        />
        <Form form={accountForm} layout="vertical" onFinish={(values) => void provisionAccount(values)}>
          <Form.Item name="email" label="Login email" rules={[{ required: true }, { type: "email", message: "Enter a valid email address" }]}>
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item name="role" label="System role" rules={[{ required: true }]}>
            <Select
              placeholder="Select a role"
              options={grantRoleOptions.map((role) => ({ label: role, value: role }))}
              loading={grantRolesLoading}
            />
          </Form.Item>
          <Form.Item name="password" label="Initial password" rules={[{ required: true }, { min: 12, message: "Use at least 12 characters" }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Confirm password"
            dependencies={["password"]}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  return !value || getFieldValue("password") === value
                    ? Promise.resolve()
                    : Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
