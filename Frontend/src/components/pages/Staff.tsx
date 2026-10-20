import React, { useEffect, useState } from "react";
import {
  Modal,
  Input,
  AutoComplete,
  Select,
  Switch,
  DatePicker,
  Button,
  ConfigProvider,
  Checkbox,
  TimePicker,
  Row,
  Col,
  Card,
  Tag,
  Typography,
  Flex,
  Avatar,
  Empty,
  Divider
} from "antd";
import { Search, Calendar, Plus, Mail, Phone } from "lucide-react";
import { useFormik } from "formik";
import * as Yup from "yup";
import dayjs from "dayjs";
import PageSkeleton from "../common/PageSkeleton";
import {
  createStaffProfile,
  getAllWards,
  getAllStaff,
  getDepartments,
  getApiErrorMessage,
  getRoles,
  updateStaffAvailability,
} from "../../services/api";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../../store/authSlice";
import type { AuthUser } from "../../types/auth";
import { toast } from "react-toastify";
import type {
  AvailabilityWindow,
  CreateStaffProfilePayload,
  Department,
  StaffDirectoryEntry,
} from "../../types/global.types";

const { TextArea, Password } = Input;
const { Title, Text, Paragraph } = Typography;

// --- Your Exact Theme Configuration ---
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
  components: {
    Card: { borderRadiusLG: 12 },
    Select: {
      optionActiveBg: '#CCFBF1',
      optionSelectedBg: '#E6FFFB',
      optionSelectedColor: '#0F766E',
    },
  }
};

const availabilityValidationSchema = Yup.array()
  .of(
    Yup.object({
      dayOfWeek: Yup.number().integer().min(0).max(6).required(),
      startMinute: Yup.number().integer().min(0).max(1439).required(),
      endMinute: Yup.number()
        .integer()
        .min(1)
        .max(1440)
        .moreThan(Yup.ref("startMinute"), "End time must be later than start time")
        .required(),
    }),
  )
  .max(7)
  .required();

const profileSchema = Yup.object().shape({
  type: Yup.string()
    .oneOf(["Doctor", "Staff"])
    .required("Staff Type is required"),
  availability: availabilityValidationSchema,
  name: Yup.string().trim().min(2, "Name must be at least 2 characters").required("Name is required"),
  email: Yup.string().when(["type", "hasSystemAccess"], {
    is: (type: string, hasSystemAccess: boolean) => type === "Doctor" || hasSystemAccess,
    then: (schema) => schema.email("Enter a valid email address").required("Email Account is required"),
    otherwise: (schema) => schema.notRequired(),
  }),
  employeeId: Yup.string().required("Employee ID is required"),
  departmentId: Yup.string().required("Department is required"),
  phone: Yup.string().required("Phone number is required"),
  isActive: Yup.boolean(),
  specialization: Yup.string().when("type", {
    is: "Doctor",
    then: (schema) => schema.required("Specialization is required"),
    otherwise: (schema) => schema.notRequired(),
  }),
  licenseNumber: Yup.string().when("type", {
    is: "Doctor",
    then: (schema) => schema.required("License Number is required"),
    otherwise: (schema) => schema.notRequired(),
  }),
  qualifications: Yup.string().when("type", {
    is: "Doctor",
    then: (schema) => schema.notRequired(),
    otherwise: (schema) => schema.notRequired(),
  }),
  description: Yup.string(),
  wardId: Yup.string(),
  joiningDate: Yup.string().nullable(),
  password: Yup.string().when(["type", "hasSystemAccess"], {
    is: (type: string, hasSystemAccess: boolean) => type === "Doctor" || hasSystemAccess,
    then: (schema) => schema.min(12, "Password must be at least 12 characters").required("Password is required"),
    otherwise: (schema) => schema.notRequired(),
  }),
  role: Yup.string().when("type", {
    is: (type: string) => type === "Staff",
    then: (schema) => schema.when("hasSystemAccess", {
      is: true,
      then: (roleSchema) => roleSchema.required("System role is required"),
      otherwise: (roleSchema) => roleSchema.notRequired(),
    }),
    otherwise: (schema) => schema.notRequired(),
  }),
  designation: Yup.string().when(["type", "hasSystemAccess"], {
    is: (type: string, hasSystemAccess: boolean) => type === "Staff" && !hasSystemAccess,
    then: (schema) => schema.required("Designation is required"),
    otherwise: (schema) => schema.notRequired(),
  }),
});

const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const minuteToTime = (minute: number) => dayjs().startOf("day").add(minute, "minute");

const formatAvailability = (availability: AvailabilityWindow[]) =>
  availability
    .filter((slot) => slot.isActive !== false)
    .map((slot) => `${weekDays[slot.dayOfWeek]} ${minuteToTime(slot.startMinute).format("h:mm A")}–${minuteToTime(slot.endMinute).format("h:mm A")}`);

function WeeklyAvailabilityEditor({
  value,
  onChange,
}: {
  value: AvailabilityWindow[];
  onChange: (availability: AvailabilityWindow[]) => void;
}) {
  return (
    <div style={{ border: `1px solid #E2E8F0`, borderRadius: 8, padding: 16 }}>
      {weekDays.map((day, dayOfWeek) => {
        const slot = value.find((entry) => entry.dayOfWeek === dayOfWeek);

        return (
          <Flex
            align="center"
            justify="space-between"
            wrap="wrap"
            gap={8}
            style={{ padding: '12px 0', borderBottom: dayOfWeek !== 6 ? `1px solid #E2E8F0` : 'none' }}
            key={day}
          >
            <Checkbox
              checked={Boolean(slot)}
              onChange={(event) => {
                const next = event.target.checked
                  ? [...value, { dayOfWeek, startMinute: 540, endMinute: 1020 }]
                  : value.filter((entry) => entry.dayOfWeek !== dayOfWeek);
                onChange(next.sort((left, right) => left.dayOfWeek - right.dayOfWeek));
              }}
            >
              {day}
            </Checkbox>
            <TimePicker.RangePicker
              disabled={!slot}
              format="h:mm A"
              minuteStep={15}
              use12Hours
              value={
                slot
                  ? [minuteToTime(slot.startMinute), minuteToTime(slot.endMinute)]
                  : null
              }
              onChange={(range) => {
                const start = range?.[0];
                const end = range?.[1];
                if (!start || !end) return;

                const startMinute = start.hour() * 60 + start.minute();
                let endMinute = end.hour() * 60 + end.minute();
                if (endMinute <= startMinute) {
                  if (endMinute === 0) endMinute = 1440;
                  else {
                    toast.error("End time must be later than start time");
                    return;
                  }
                }

                onChange(
                  value.map((entry) =>
                    entry.dayOfWeek === dayOfWeek
                      ? { ...entry, startMinute, endMinute }
                      : entry,
                  ),
                );
              }}
            />
          </Flex>
        );
      })}
    </div>
  );
}

function Staff() {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<StaffDirectoryEntry[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [activeStaff, setActiveStaff] = useState<StaffDirectoryEntry | null>(null);
  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [wards, setWards] = useState<{ id: string; name: string }[]>([]);
  const [wardsLoading, setWardsLoading] = useState(false);
  const [roleOptions, setRoleOptions] = useState<{ value: string; label: string }[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const user = useSelector(selectCurrentUser) as AuthUser | null;

  useEffect(() => {
    if (!showModal || !user?.tenantId) return;

    getDepartments(user.tenantId)
      .then((res: Department[]) => setDepartments(res))
      .catch((err: unknown) => {
        toast.error(getApiErrorMessage(err, "Failed to load departments"));
      });
  }, [showModal, user?.tenantId]);

  useEffect(() => {
    if (!showModal || !user?.tenantId) return;

    let isCurrent = true;
    const timer = window.setTimeout(() => {
      if (isCurrent) setRolesLoading(true);
    }, 0);
    getRoles({ page: 1, limit: 100 })
      .then((result) => {
        if (isCurrent) {
          setRoleOptions(result.roles.map((role) => ({ value: role.name, label: role.name })));
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          toast.error(getApiErrorMessage(error, "Failed to load existing roles"));
          setRoleOptions([]);
        }
      })
      .finally(() => {
        if (isCurrent) setRolesLoading(false);
      });

    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [showModal, user?.tenantId]);

  useEffect(() => {
    if (!showModal || !user?.tenantId) return;

    let isCurrent = true;
    const timer = window.setTimeout(() => {
      setWardsLoading(true);
      getAllWards()
        .then((records) => {
          if (isCurrent) {
            setWards(records.map(({ id, name }) => ({ id, name })));
          }
        })
        .catch((err: unknown) => {
          if (isCurrent) {
            toast.error(getApiErrorMessage(err, "Failed to load wards"));
          }
        })
        .finally(() => {
          if (isCurrent) setWardsLoading(false);
        });
    }, 0);

    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [showModal, user?.tenantId]);

  useEffect(() => {
    if (!user?.tenantId) return;

    getAllStaff()
      .then((records) => {
        setStaffList(records);
        setActiveStaff((current) =>
          records.find((record) => record.id === current?.id) ?? records[0] ?? null,
        );
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load staff";
        toast.error(message);
      }).finally(() => setStaffLoading(false));
  }, [user?.tenantId]);

  const formik = useFormik({
    initialValues: {
      type: "Doctor",
      name: "",
      email: "",
      employeeId: "",
      departmentId: "",
      phone: "",
      role: "",
      hasSystemAccess: true,
      password: "",
      isActive: true,
      specialization: "",
      qualifications: "",
      licenseNumber: "",
      description: "",
      designation: "",
      wardId: "",
      joiningDate: null as string | null,
      availability: [] as AvailabilityWindow[],
    },
    validationSchema: editingId
      ? Yup.object({ availability: availabilityValidationSchema })
      : profileSchema,
    onSubmit: async (values, { resetForm, setSubmitting }) => {
      const isDoctor = values.type === "Doctor";
      const payload: CreateStaffProfilePayload = isDoctor
        ? {
            type: "Doctor" as const,
            name: values.name.trim(),
            email: values.email,
            employeeId: values.employeeId,
            departmentId: values.departmentId,
            phone: values.phone,
            isActive: values.isActive,
            password: values.password,
            specialization: values.specialization,
            qualifications: values.qualifications,
            licenseNumber: values.licenseNumber,
            description: values.description || undefined,
            designation: values.designation || undefined,
            availability: values.availability,
          }
        : {
            type: "Staff" as const,
            name: values.name.trim(),
            employeeId: values.employeeId,
            departmentId: values.departmentId,
            phone: values.phone,
            isActive: values.isActive,
            wardId: values.wardId || undefined,
            joiningDate: values.joiningDate || undefined,
            designation: values.designation,
            description: values.description || undefined,
            ...(values.hasSystemAccess
              ? { hasSystemAccess: true as const, email: values.email, password: values.password, role: values.role }
              : { hasSystemAccess: false as const }),
            availability: values.availability,
          };

      try {
        if (editingId) {
          const availability = await updateStaffAvailability(
            editingId,
            values.type as "Doctor" | "Staff",
            values.availability,
          );
          setStaffList((current) =>
            current.map((profile) =>
              profile.id === editingId ? { ...profile, availability } : profile,
            ),
          );
          setActiveStaff((current) =>
            current?.id === editingId ? { ...current, availability } : current,
          );
          toast.success("Availability updated successfully");
          setShowModal(false);
          setEditingId(null);
          resetForm();
          return;
        }

        const result = await createStaffProfile(payload);
        const created: StaffDirectoryEntry = {
          id: result.profile.id,
          userId: result.user?.id ?? null,
          hasSystemAccess: values.type === "Doctor" || values.hasSystemAccess,
          name: result.user?.name ?? values.name,
          role: values.type === "Doctor" ? values.designation || "Doctor" : values.hasSystemAccess ? values.role : values.designation,
          type: result.type,
          email: result.user?.email ?? "",
          phone: values.phone || "",
          bio: values.description || values.specialization || values.designation || values.role,
          availability: result.availability,
          image: "https://i.pravatar.cc/150?u=" + encodeURIComponent(result.user?.id ?? result.profile.id),
        };
        setStaffList((current) => [created, ...current]);
        setActiveStaff(created);
        if (result.credentialsEmail?.sent) {
          toast.success(`${values.type} created. Sign-in credentials were emailed to ${result.user?.email}.`);
        } else if (result.user) {
          toast.warning(`${values.type} created, but the credentials email could not be sent. Check the email service configuration and contact the staff member securely.`);
        } else {
          toast.success(`${values.type} profile created successfully`);
        }
        setShowModal(false);
        setEditingId(null);
        resetForm();
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } };
        toast.error(error.response?.data?.message || "Could not create profile");
      } finally {
        setSubmitting(false);
      }
    },
  });

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    formik.resetForm();
  };

  const handleEdit = (staff: StaffDirectoryEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(staff.id);
    formik.setValues({
      ...formik.initialValues,
      type: staff.type,
      phone: staff.phone,
      description: staff.bio,
      designation: staff.role,
      availability: staff.availability,
    });
    setShowModal(true);
  };

  const errorMessage = (name: keyof typeof formik.values) =>
    formik.touched[name] && formik.errors[name] ? (
      <Text type="danger" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
        {formik.errors[name] as string}
      </Text>
    ) : null;

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportStaff = () => {
    const columns = ["Name", "Type", "Role", "Email", "Phone", "Availability"];
    const csvCell = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const rows = filteredStaff.map((staff) => [
      staff.name,
      staff.type,
      staff.role,
      staff.email,
      staff.phone,
      formatAvailability(staff.availability ?? []).join("; "),
    ]);
    const csv = [columns, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `carebase-staff-${dayjs().format("YYYY-MM-DD")}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (staffLoading) return <PageSkeleton />;

  return (
    <ConfigProvider theme={themeConfig}>
      <div className="staff-directory-page" style={{ padding: 24, minHeight: '100vh', backgroundColor: themeConfig.token.colorBgLayout }}>
        
        {/* Header Bar */}
        <Flex className="staff-directory-toolbar" justify="space-between" align="center" wrap="wrap" gap={12} style={{ backgroundColor: '#fff', padding: '16px 24px', borderRadius: 8, marginBottom: 24, boxShadow: themeConfig.token.boxShadowTertiary }}>
          <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Staff Directory</Title>

          <Input
            prefix={<Search size={16} color="#94A3B8" />}
            placeholder="Search staff members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="staff-directory-search"
            style={{ width: 320, borderRadius: 8 }}
            size="large"
            allowClear
          />

          <Flex className="staff-directory-actions" align="center" gap={12} wrap="wrap">
            <Flex align="center" gap={8} style={{ backgroundColor: themeConfig.token.colorBgLayout, padding: '8px 16px', borderRadius: 8 }}>
              <Calendar size={16} color="#64748B" />
              <Text strong style={{ color: themeConfig.token.colorTextBase, fontSize: 13 }}>
                {dayjs().format("dddd, DD MMMM YYYY")}
              </Text>
            </Flex>
            <Button size="large" onClick={exportStaff} disabled={filteredStaff.length === 0}>Export CSV</Button>
            <Button
              type="primary"
              size="large"
              icon={<Plus size={18} />}
              onClick={() => setShowModal(true)}
              style={{ fontWeight: 600 }}
            >
              Add Staff
            </Button>
          </Flex>
        </Flex>

        {/* Main Layout */}
        <Row gutter={[24, 24]}>
          {/* Left Column: Scrollable Staff Cards Grid */}
          <Col xs={24} lg={16}>
            <div style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto', paddingRight: 8 }}>
              <Row gutter={[16, 16]}>
                {filteredStaff.map((staff) => {
                  const isActive = activeStaff?.id === staff.id;
                  return (
                    <Col xs={24} sm={12} xl={12} key={staff.id}>
                      <Card
                        hoverable
                        onClick={() => setActiveStaff(staff)}
                        style={{
                          height: '100%',
                          border: isActive ? `2px solid ${themeConfig.token.colorPrimary}` : `1px solid #E2E8F0`,
                          boxShadow: isActive ? '0 4px 12px rgba(15, 118, 110, 0.15)' : themeConfig.token.boxShadowTertiary,
                          transition: 'all 0.2s ease',
                        }}
                        bodyStyle={{ padding: 20 }}
                      >
                        <Flex gap={16}>
                          <Avatar 
                            src={staff.image} 
                            shape="square" 
                            size={72} 
                            style={{ borderRadius: 8, minWidth: 72 }} 
                          />
                          <Flex vertical justify="space-between" style={{ width: '100%' }}>
                            <div>
                              <Flex justify="space-between" align="flex-start" style={{ marginBottom: 4 }}>
                                <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                                  {staff.role}
                                </Text>
                                <Tag color={staff.type === "Doctor" ? "blue" : "orange"} style={{ margin: 0, borderRadius: 12, border: 'none' }}>
                                  {staff.type}
                                </Tag>
                                {staff.type === "Staff" && <Tag color={staff.hasSystemAccess ? "green" : "default"} style={{ margin: 0, borderRadius: 12 }}>
                                  {staff.hasSystemAccess ? "System access" : "No login"}
                                </Tag>}
                              </Flex>
                              <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>
                                {staff.name}
                              </Text>
                              <Paragraph 
                                type="secondary" 
                                style={{ fontSize: 13, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                              >
                                {staff.bio}
                              </Paragraph>
                            </div>

                            <Flex justify="space-between" align="flex-end" style={{ marginTop: 12 }}>
                              <Flex vertical gap={4}>
                                {staff.email && <Flex align="center" gap={6}>
                                  <Mail size={12} color="#94A3B8" />
                                  <Text type="secondary" style={{ fontSize: 12 }}>{staff.email}</Text>
                                </Flex>}
                                <Flex align="center" gap={6}>
                                  <Phone size={12} color="#94A3B8" />
                                  <Text type="secondary" style={{ fontSize: 12 }}>{staff.phone}</Text>
                                </Flex>
                              </Flex>
                              <Button 
                                size="small" 
                                shape="round" 
                                onClick={(e) => handleEdit(staff, e)}
                              >
                                Edit
                              </Button>
                            </Flex>
                          </Flex>
                        </Flex>
                      </Card>
                    </Col>
                  );
                })}
                {filteredStaff.length === 0 && (
                  <Col span={24}>
                    <Empty description="No staff members found" style={{ marginTop: 60 }} />
                  </Col>
                )}
              </Row>
            </div>
          </Col>

          {/* Right Column: Active Profile Detail View */}
          <Col xs={24} lg={8}>
            <div style={{ position: 'sticky', top: 24 }}>
              <Card bordered={false} style={{ boxShadow: themeConfig.token.boxShadowTertiary }}>
                {activeStaff ? (
                  <>
                    <Flex justify="space-between" align="flex-start" style={{ marginBottom: 24 }}>
                      <Title level={5} style={{ margin: 0 }}>Profile Details</Title>
                      <Tag color={activeStaff.type === "Doctor" ? "blue" : "orange"} style={{ margin: 0, borderRadius: 12, border: 'none', padding: '2px 12px', fontWeight: 500 }}>
                        {activeStaff.type}
                      </Tag>
                      {activeStaff.type === "Staff" && <Tag color={activeStaff.hasSystemAccess ? "green" : "default"}>
                        {activeStaff.hasSystemAccess ? "System access" : "No login"}
                      </Tag>}
                    </Flex>

                    <Flex vertical align="center" style={{ marginBottom: 24 }}>
                      <Avatar 
                        src={activeStaff.image} 
                        size={120} 
                        style={{ border: `4px solid ${themeConfig.token.colorBgLayout}`, marginBottom: 16 }} 
                      />
                      <Title level={4} style={{ margin: 0 }}>{activeStaff.name}</Title>
                      <Text type="secondary">{activeStaff.role}</Text>
                    </Flex>

                    <div style={{ backgroundColor: themeConfig.token.colorBgLayout, padding: 20, borderRadius: 8 }}>
                      <div style={{ marginBottom: 16 }}>
                        <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Specialization</Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>{activeStaff.role}</Text>
                      </div>
                      
                      <div style={{ marginBottom: 16 }}>
                        <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Weekly Availability</Text>
                        {formatAvailability(activeStaff.availability).length > 0 ? (
                          <ul style={{ paddingLeft: 16, margin: 0 }}>
                            {formatAvailability(activeStaff.availability).map((slot) => (
                              <li key={slot}><Text type="secondary" style={{ fontSize: 13 }}>{slot}</Text></li>
                            ))}
                          </ul>
                        ) : (
                          <Text type="secondary" style={{ fontSize: 13 }}>Not configured</Text>
                        )}
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Contact</Text>
                        {activeStaff.email && <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>{activeStaff.email}</Text>}
                        <Text type="secondary" style={{ fontSize: 13 }}>{activeStaff.phone}</Text>
                      </div>

                      <div>
                        <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Responsibilities</Text>
                        <Paragraph type="secondary" style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                          {activeStaff.bio}
                        </Paragraph>
                      </div>
                    </div>
                  </>
                ) : (
                  <Empty description="Select a profile to view details" style={{ margin: '60px 0' }} />
                )}
              </Card>
            </div>
          </Col>
        </Row>

        {/* --- Ant Design Modal --- */}
        <Modal
          title={<Title level={4} style={{ margin: 0 }}>{editingId ? "Edit Availability" : "Add New Profile"}</Title>}
          open={showModal}
          onCancel={handleClose}
          width={800}
          centered
          destroyOnClose
          zIndex={1100}
          footer={[
            <Button key="back" size="large" onClick={handleClose}>
              Cancel
            </Button>,
            <Button
              key="submit"
              type="primary"
              size="large"
              loading={formik.isSubmitting}
              onClick={() => formik.handleSubmit()}
              style={{ fontWeight: 600 }}
            >
              {editingId ? "Save Availability" : "Create Profile"}
            </Button>,
          ]}
        >
          <div style={{ paddingTop: 16 }}>
            {!editingId && (
              <>
                <Row style={{ marginBottom: 24 }}>
                  <Col span={24}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Profile Type</Text>
                    <Select
                      style={{ width: '100%' }}
                      size="large"
                      value={formik.values.type}
                      onChange={(val) => formik.setFieldValue("type", val)}
                      options={[
                        { value: "Doctor", label: "Medical Doctor" },
                        { value: "Staff", label: "Hospital Staff (Nurse, Admin, etc.)" },
                      ]}
                    />
                  </Col>
                </Row>

                <Divider orientation="horizontal" style={{ margin: '16px 0 24px 0' }}>
                  <Text strong>General Information</Text>
                </Divider>

                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col xs={24} md={12}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Full Name <Text type="danger">*</Text></Text>
                    <Input
                      size="large"
                      name="name"
                      placeholder="Full name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      status={formik.touched.name && formik.errors.name ? "error" : ""}
                    />
                    {errorMessage("name")}
                  </Col>
                  {(formik.values.type === "Doctor" || formik.values.hasSystemAccess) && <Col xs={24} md={12}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Email <Text type="danger">*</Text></Text>
                    <Input
                      size="large"
                      name="email"
                      placeholder="johndeo@gmail.com"
                      value={formik.values.email}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      status={formik.touched.email && formik.errors.email ? "error" : ""}
                    />
                    {errorMessage("email")}
                  </Col>}
                  {(formik.values.type === "Doctor" || formik.values.hasSystemAccess) && <Col xs={24} md={12}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Password <Text type="danger">*</Text></Text>
                    <Password
                      size="large"
                      name="password"
                      placeholder="Enter a password"
                      value={formik.values.password}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      status={formik.touched.password && formik.errors.password ? "error" : ""}
                    />
                    {errorMessage("password")}
                  </Col>}
                  <Col xs={24} md={12}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Employee ID <Text type="danger">*</Text></Text>
                    <Input
                      size="large"
                      name="employeeId"
                      placeholder="e.g. EMP-1042"
                      value={formik.values.employeeId}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      status={formik.touched.employeeId && formik.errors.employeeId ? "error" : ""}
                    />
                    {errorMessage("employeeId")}
                  </Col>
                  <Col xs={24} md={12}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Department <Text type="danger">*</Text></Text>
                    <Select
                      style={{ width: '100%' }}
                      size="large"
                      placeholder="Select Department..."
                      value={formik.values.departmentId || null}
                      onChange={(val) => formik.setFieldValue("departmentId", val)}
                      onBlur={() => formik.setFieldTouched("departmentId", true)}
                      status={formik.touched.departmentId && formik.errors.departmentId ? "error" : ""}
                      options={departments?.map((obj) => ({ value: obj.id, label: obj.name }))}
                    />
                    {errorMessage("departmentId")}
                  </Col>
                  <Col xs={24} md={12}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Phone Number <Text type="danger">*</Text></Text>
                    <Input
                      size="large"
                      name="phone"
                      value={formik.values.phone}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      status={formik.touched.phone && formik.errors.phone ? "error" : ""}
                    />
                    {errorMessage("phone")}
                  </Col>
                </Row>

                {formik.values.type === "Doctor" ? (
                  <>
                    <Divider orientation="horizontal" style={{ margin: '16px 0 24px 0' }}>
                      <Text strong style={{ color: themeConfig.token.colorPrimary }}>Clinical Credentials</Text>
                    </Divider>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={12}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Specialization <Text type="danger">*</Text></Text>
                        <Input
                          size="large"
                          name="specialization"
                          placeholder="e.g. Pediatric Cardiology"
                          value={formik.values.specialization}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          status={formik.touched.specialization && formik.errors.specialization ? "error" : ""}
                        />
                        {errorMessage("specialization")}
                      </Col>
                      <Col xs={24} md={12}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Medical License Number <Text type="danger">*</Text></Text>
                        <Input
                          size="large"
                          name="licenseNumber"
                          value={formik.values.licenseNumber}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          status={formik.touched.licenseNumber && formik.errors.licenseNumber ? "error" : ""}
                        />
                        {errorMessage("licenseNumber")}
                      </Col>
                      <Col xs={24} md={12}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Designation / Title</Text>
                        <Input
                          size="large"
                          name="designation"
                          placeholder="e.g. Head of Surgery"
                          value={formik.values.designation}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          status={formik.touched.designation && formik.errors.designation ? "error" : ""}
                        />
                        {errorMessage("designation")}
                      </Col>
                      <Col xs={24} md={12}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Qualifications</Text>
                        <Input
                          size="large"
                          name="qualifications"
                          placeholder="e.g. MD, FACS"
                          value={formik.values.qualifications}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          status={formik.touched.qualifications && formik.errors.qualifications ? "error" : ""}
                        />
                        {errorMessage("qualifications")}
                      </Col>
                      <Col span={24}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Professional Description</Text>
                        <TextArea
                          rows={3}
                          name="description"
                          placeholder="Brief clinical biography..."
                          value={formik.values.description}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          status={formik.touched.description && formik.errors.description ? "error" : ""}
                        />
                        {errorMessage("description")}
                      </Col>
                    </Row>
                  </>
                ) : (
                  <>
                    <Divider orientation="horizontal" style={{ margin: '16px 0 24px 0' }}>
                      <Text strong>Staff Assignment Details</Text>
                    </Divider>
                    <Flex align="center" gap={10} style={{ marginBottom: 20 }}>
                      <Switch
                        checked={formik.values.hasSystemAccess}
                        onChange={(checked) => {
                          formik.setFieldValue("hasSystemAccess", checked);
                          if (!checked) formik.setFieldValue("role", "");
                        }}
                      />
                      <div>
                        <Text strong>System access</Text>
                        <Text type="secondary" style={{ display: "block" }}>
                          {formik.values.hasSystemAccess ? "This staff member can sign in with an account." : "Personnel record only; no login or password will be created."}
                        </Text>
                      </div>
                    </Flex>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={12}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Assigned Ward</Text>
                        <Select
                          style={{ width: '100%' }}
                          size="large"
                          placeholder="None"
                          allowClear
                          value={formik.values.wardId || null}
                          onChange={(val) => formik.setFieldValue("wardId", val)}
                          loading={wardsLoading}
                          showSearch
                          optionFilterProp="label"
                          options={wards.map((ward) => ({ value: ward.id, label: ward.name }))}
                        />
                      </Col>
                      {!formik.values.hasSystemAccess && <Col xs={24} md={12}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Job Designation <Text type="danger">*</Text></Text>
                        <AutoComplete
                          className="staff-designation-autocomplete"
                          style={{ width: '100%' }}
                          size="large"
                          value={formik.values.designation}
                          options={["Security Guard", "Sweeper", "Janitor", "Driver", "Maintenance Worker", "Cook", "Laundry Attendant", "Porter"].map((designation) => ({ value: designation }))}
                          filterOption={(inputValue, option) =>
                            (option?.value ?? "").toLowerCase().includes(inputValue.toLowerCase())
                          }
                          onChange={(value) => formik.setFieldValue("designation", value)}
                          onBlur={() => formik.setFieldTouched("designation", true)}
                        >
                          <Input
                            name="designation"
                            placeholder="e.g. Security Guard, Sweeper, Driver"
                            status={formik.touched.designation && formik.errors.designation ? "error" : ""}
                          />
                        </AutoComplete>
                        {errorMessage("designation")}
                      </Col>}
                      <Col xs={24} md={12}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Joining Date</Text>
                        <DatePicker
                          style={{ width: '100%' }}
                          size="large"
                          value={formik.values.joiningDate ? dayjs(formik.values.joiningDate) : null}
                          onChange={(_, dateString) => formik.setFieldValue("joiningDate", dateString)}
                        />
                      </Col>
                      {formik.values.hasSystemAccess && <Col xs={24} md={12}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Role <Text type="danger">*</Text></Text>
                        <Select
                          style={{ width: '100%' }}
                          size="large"
                          placeholder="Select Role..."
                          allowClear
                          value={formik.values.role || null}
                          onChange={(val) => formik.setFieldValue("role", val)}
                          options={roleOptions}
                          loading={rolesLoading}
                          disabled={rolesLoading || roleOptions.length === 0}
                          onBlur={() => formik.setFieldTouched("role", true)}
                          status={formik.touched.role && formik.errors.role ? "error" : ""}
                        />
                        {errorMessage("role")}
                      </Col>}
                    </Row>
                  </>
                )}
              </>
            )}

            <Divider orientation="horizontal" style={{ margin: '24px 0 24px 0' }}>
              <Text strong>Weekly Availability</Text>
            </Divider>
            
            <WeeklyAvailabilityEditor
              value={formik.values.availability}
              onChange={(availability) => formik.setFieldValue("availability", availability)}
            />

            {!editingId && (
              <Flex align="center" gap={8} style={{ marginTop: 24 }}>
                <Switch
                  checked={formik.values.isActive}
                  onChange={(checked) => formik.setFieldValue("isActive", checked)}
                />
                <Text strong>Profile is Active</Text>
              </Flex>
            )}
          </div>
        </Modal>
      </div>
    </ConfigProvider>
  );
}

export default Staff;
