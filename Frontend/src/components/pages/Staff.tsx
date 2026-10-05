import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Badge } from "react-bootstrap";
import {
  Modal,
  Input,
  Select,
  Switch,
  DatePicker,
  Button,
  ConfigProvider,
  Checkbox,
  TimePicker,
} from "antd";
import { Search, Calendar, Plus, Mail, Phone } from "lucide-react";
import { useFormik } from "formik";
import * as Yup from "yup";
import dayjs from "dayjs";
import {
  createStaffProfile,
  getAllStaff,
  getDepartments,
  updateStaffAvailability,
} from "../../services/api";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../../store/authSlice";
import type { AuthUser } from "../../types/auth";
import { toast } from "react-toastify";
import type {
  AvailabilityWindow,
  Department,
  StaffDirectoryEntry,
} from "../../types/global.types";

const { TextArea, Password } = Input;

const staffRoleEnum = [
  // WARD-BASED STAFF 
  // These roles are commonly assigned to a ward.
  { value: "Nurse", label: "Nurse" },
  { value: "Head Nurse", label: "Head Nurse" },
  { value: "Patient Care Technician", label: "Patient Care Technician" },
  { value: "Ward Clerk", label: "Ward Clerk" },

  // DEPARTMENT-BASED CLINICAL 
  // These roles are commonly assigned to a department.
  { value: "Pharmacist", label: "Pharmacist" },
  { value: "Lab Technician", label: "Lab Technician" },
  { value: "Radiology Technician", label: "Radiology Technician" },
  { value: "Physiotherapist", label: "Physiotherapist" },

  // ADMINISTRATIVE & SUPPORT 
  // Administrative roles are commonly department-based.
  { value: "Admin", label: "Admin" },
  { value: "Receptionist", label: "Receptionist" },
  { value: "Billing Specialist", label: "Billing Specialist" },
  { value: "HR Manager", label: "HR Manager" },
  { value: "IT Support", label: "IT Support" },

  // FACILITY OPERATIONS 
  // Facility roles may be assigned to a ward or department.
  { value: "Housekeeping", label: "Housekeeping" },
  { value: "Security", label: "Security" },
  { value: "Maintenance", label: "Maintenance" }
];

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

// 1. Dynamic Validation Schema
const profileSchema = Yup.object().shape({
  type: Yup.string()
    .oneOf(["Doctor", "Staff"])
    .required("Staff Type is required"),
  availability: availabilityValidationSchema,
  name: Yup.string().trim().min(2, "Name must be at least 2 characters").required("Name is required"),
  email: Yup.string().email("Enter a valid email address").required("Email Account is required"),
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
  designation: Yup.string(),
  wardId: Yup.string(),
  joiningDate: Yup.string().nullable(),
  password: Yup.string()
    .min(12, "Password must be at least 12 characters")
    .required("Password is required"),
  role: Yup.string().when("type", {
    is: "Staff",
    then: (schema) => schema.required("Role is required"),
    otherwise: (schema) => schema.notRequired(),
  }),
});

const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const minuteToTime = (minute: number) =>
  dayjs().startOf("day").add(minute, "minute");

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
    <div className="border rounded p-3">
      {weekDays.map((day, dayOfWeek) => {
        const slot = value.find((entry) => entry.dayOfWeek === dayOfWeek);

        return (
          <div
            className="d-flex flex-wrap align-items-center justify-content-between gap-2 py-2 border-bottom"
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
          </div>
        );
      })}
    </div>
  );
}

function Staff() {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<StaffDirectoryEntry[]>([]);
  const [activeStaff, setActiveStaff] = useState<StaffDirectoryEntry | null>(null);
  const [departments,setDepartments] = useState<Department[] | null>(null)
  const user = useSelector(selectCurrentUser) as AuthUser | null

  useEffect(() => {
    if (!showModal || !user?.tenantId) return;

    getDepartments(user.tenantId)
      .then((res) => setDepartments(res))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load departments";
        toast.error(message);
      });
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
      });
  }, [user?.tenantId]);
  // 2. Formik Initialization
  const formik = useFormik({
    initialValues: {
      type: "Doctor",
      name: "",
      email: "",
      employeeId: "",
      departmentId: "",
      phone: "",
      role: "",
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
      const payload = isDoctor
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
            email: values.email,
            employeeId: values.employeeId,
            departmentId: values.departmentId,
            phone: values.phone,
            password: values.password,
            isActive: values.isActive,
            wardId: values.wardId || undefined,
            joiningDate: values.joiningDate || undefined,
            role: values.role,
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
          userId: result.user.id,
          name: result.user.name,
          role: values.type === "Doctor" ? values.designation || "Doctor" : values.role,
          type: result.type,
          email: result.user.email,
          phone: values.phone,
          bio: values.description || values.specialization || values.role,
          availability: result.availability,
          image: "https://i.pravatar.cc/150?u=" + encodeURIComponent(result.user.id),
        };
        setStaffList((current) => [created, ...current]);
        setActiveStaff(created);
        toast.success(`${values.type} profile created successfully`);
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
      <div className="text-danger small mt-1">
        {formik.errors[name] as string}
      </div>
    ) : null;

  return (
    <ConfigProvider
      theme={{ token: { colorPrimary: "#0F766E", borderRadius: 8 } }}
    >
      <Container fluid className="p-4 bg-light min-vh-100 staff-page">
        {/* Header Bar */}
        <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 rounded shadow-sm border-0">
          <h3 className="fw-bold mb-0 me-4 text-dark">Staff</h3>

          <Input
            prefix={<Search size={18} className="text-muted" />}
            placeholder="Search staff members..."
            className="w-25 me-auto bg-light border-0"
            size="large"
          />

          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center text-muted bg-light px-3 py-2 rounded border border-light">
              <Calendar size={16} className="me-2" />
              <span className="small fw-medium">
                {dayjs().format("dddd, DD MMMM YYYY")}
              </span>
            </div>
            <Button size="large">Export</Button>
            <Button
              type="primary"
              size="large"
              icon={<Plus size={18} />}
              onClick={() => setShowModal(true)}
            >
              Add Staff
            </Button>
          </div>
        </div>

        {/* --- Main Layout --- */}
        <Row className="g-4">
          {/* Left Column: Scrollable Staff Cards Grid */}
          <Col lg={8}>
            <div className="staff-scroll-container">
              <Row xs={1} md={2} className="g-4">
                {staffList.map((staff) => (
                  <Col key={staff.id}>
                    <Card
                      className={`h-100 shadow-sm staff-card-hover ${activeStaff?.id === staff.id ? "active-staff-card" : ""}`}
                      onClick={() => setActiveStaff(staff)}
                    >
                      <Card.Body className="d-flex gap-3 p-4">
                        <img
                          src={staff.image}
                          alt={staff.name}
                          style={{
                            width: 72,
                            height: 96,
                            borderRadius: 10,
                            objectFit: "cover",
                          }}
                          className="shadow-sm"
                        />

                        <div className="d-flex flex-column w-100">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <span className="text-muted small fw-medium">
                              {staff.role}
                            </span>
                            <Badge
                              bg={
                                staff.type === "Doctor" ? "primary" : "warning"
                              }
                              text={staff.type === "Doctor" ? "white" : "dark"}
                              className={`bg-opacity-25 rounded-pill fw-normal px-2 ${staff.type === "Doctor" ? "text-primary border border-primary" : "border border-warning"}`}
                            >
                              {staff.type}
                            </Badge>
                          </div>

                          <h6 className="fw-bold mb-1 text-dark">
                            {staff.name}
                          </h6>
                          <p
                            className="text-muted small mb-2"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              lineHeight: "1.5",
                            }}
                          >
                            {staff.bio}
                          </p>

                          <div className="mt-auto d-flex justify-content-between align-items-end">
                            <div>
                              <div className="text-muted small d-flex align-items-center mb-1">
                                <Mail
                                  size={12}
                                  className="me-2 text-secondary"
                                />{" "}
                                {staff.email}
                              </div>
                              <div className="text-muted small d-flex align-items-center">
                                <Phone
                                  size={12}
                                  className="me-2 text-secondary"
                                />{" "}
                                {staff.phone}
                              </div>
                            </div>
                            <Button
                              type="default"
                              shape="round"
                              size="small"
                              onClick={(e) => handleEdit(staff, e)}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
                {staffList.length === 0 && (
                  <Col>
                    <p className="text-muted py-5 text-center">
                      No doctors or staff profiles have been added yet.
                    </p>
                  </Col>
                )}
              </Row>
            </div>
          </Col>

          {/* Right Column: Active Profile Detail View */}
          <Col lg={4}>
            <Card
              className="border-0 shadow-sm sticky-top"
              style={{ top: "0", borderRadius: 16, zIndex: "auto" }}
            >
              <Card.Body className="p-4">
                {activeStaff ? (
                  <>
                <div className="d-flex justify-content-between align-items-start mb-4">
                  <h5 className="fw-bold mb-0 text-dark">Profile Staff</h5>
                  <Badge
                    bg={activeStaff.type === "Doctor" ? "primary" : "warning"}
                    text={activeStaff.type === "Doctor" ? "white" : "dark"}
                    className={`bg-opacity-25 rounded-pill px-3 py-1 fw-normal ${activeStaff.type === "Doctor" ? "text-primary border border-primary" : "border border-warning"}`}
                  >
                    {activeStaff.type}
                  </Badge>
                </div>

                <div className="text-center mb-4">
                  <img
                    src={activeStaff.image}
                    alt={activeStaff.name}
                    className="mb-3 shadow-sm"
                    style={{
                      width: 110,
                      height: 110,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "4px solid #F8FAFC",
                    }}
                  />
                  <h5 className="fw-bold mb-1 text-dark">{activeStaff.name}</h5>
                  <p className="text-muted small mb-0">{activeStaff.role}</p>
                </div>

                <div className="profile-details mt-4 bg-light p-3 rounded-3 border border-light">
                  <div className="mb-3">
                    <span className="d-block small fw-bold text-dark mb-1">
                      Specialization
                    </span>
                    <span className="small text-muted">{activeStaff.role}</span>
                  </div>
                  <div className="mb-3">
                    <span className="d-block small fw-bold text-dark mb-1">
                      Weekly Availability
                    </span>
                    {formatAvailability(activeStaff.availability).length > 0 ? (
                      <ul className="list-unstyled small text-muted mb-0">
                        {formatAvailability(activeStaff.availability).map((slot) => (
                          <li key={slot}>{slot}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="small text-muted">Not configured</span>
                    )}
                  </div>
                  <div className="mb-3">
                    <span className="d-block small fw-bold text-dark mb-1">
                      Contact
                    </span>
                    <span className="small text-muted d-block">
                      {activeStaff.email}
                    </span>
                    <span className="small text-muted">
                      {activeStaff.phone}
                    </span>
                  </div>
                  <div>
                    <span className="d-block small fw-bold text-dark mb-1">
                      Responsibilities
                    </span>
                    <p
                      className="small text-muted mb-0"
                      style={{ lineHeight: "1.6" }}
                    >
                      {activeStaff.bio}
                    </p>
                  </div>
                </div>
                  </>
                ) : (
                  <div className="py-5 text-center text-muted">
                    Select a profile to view its weekly availability.
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* --- Ant Design Modal --- */}
        <Modal
          zIndex={1100}
          title={
            <span className="fw-bold h5 text-dark">
              {editingId ? "Edit Availability" : "Add New Profile"}
            </span>
          }
          open={showModal}
          onCancel={handleClose}
          width={800}
          centered
          
          footer={[
            <Button key="back" onClick={handleClose}>
              Cancel
            </Button>,
            <Button
              key="submit"
              type="primary"
              loading={formik.isSubmitting}
              onClick={() => formik.handleSubmit()}
            >
                  {editingId ? "Save Availability" : "Create Profile"}
            </Button>,
          ]}
        >
          <div className="pt-3">
            {!editingId && <>
            <Row className="mb-4">
              <Col md={12}>
                <label className="small fw-bold text-secondary mb-1">
                  Profile Type
                </label>
                <Select
                  className="w-100"
                  size="large"
                  value={formik.values.type}
                  onChange={(val) => formik.setFieldValue("type", val)}
                  options={[
                    { value: "Doctor", label: "Medical Doctor" },
                    {
                      value: "Staff",
                      label: "Hospital Staff (Nurse, Admin, etc.)",
                    },
                  ]}
                />
              </Col>
            </Row>

            <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">
              General Information
            </h6>
            <Row className="g-3 mb-4">
              <Col md={6}>
                <label className="small fw-bold text-secondary mb-1">Full Name</label>
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
              <Col md={6}>
                <label className="small fw-bold text-secondary mb-1">
                  Email
                </label>
                <Input
                  size="large"
                  name="email"
                  placeholder="johndeo@gmail.com"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  status={
                    formik.touched.email && formik.errors.email
                      ? "error"
                      : ""
                  }
                />
                {errorMessage("email")}
              </Col>
              <Col md={6}>
                <label className="small fw-bold text-secondary mb-1">
                  Password
                </label>
                <Password
                  size="large"
                  name="password"
                  placeholder="Enter a password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  status={
                    formik.touched.password && formik.errors.password
                      ? "error"
                      : ""
                  }
                />
                {errorMessage("password")}
              </Col>
              <Col md={6}>
                <label className="small fw-bold text-secondary mb-1">
                  Employee ID
                </label>
                <Input
                  size="large"
                  name="employeeId"
                  placeholder="e.g. EMP-1042"
                  value={formik.values.employeeId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  status={
                    formik.touched.employeeId && formik.errors.employeeId
                      ? "error"
                      : ""
                  }
                />
                {errorMessage("employeeId")}
              </Col>
              <Col md={6}>
                <label className="small fw-bold text-secondary mb-1">
                  Department
                </label>
                <Select
                  className="w-100"
                  size="large"
                  placeholder="Select Department..."
                  value={formik.values.departmentId || null}
                  onChange={(val) => formik.setFieldValue("departmentId", val)}
                  onBlur={() => formik.setFieldTouched("departmentId", true)}
                  status={
                    formik.touched.departmentId && formik.errors.departmentId
                      ? "error"
                      : ""
                  }
                  options={departments?.map((obj) => {
                    return { value: obj.id, label: obj.name };
                  })}
                />
                {errorMessage("departmentId")}
              </Col>
              <Col md={6}>
                <label className="small fw-bold text-secondary mb-1">
                  Phone Number
                </label>
                <Input
                  size="large"
                  name="phone"
                  value={formik.values.phone}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  status={
                    formik.touched.phone && formik.errors.phone ? "error" : ""
                  }
                />
                {errorMessage("phone")}
              </Col>
            </Row>

            {formik.values.type === "Doctor" ? (
              <>
                <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">
                  Clinical Credentials
                </h6>
                <Row className="g-3">
                  <Col md={6}>
                    <label className="small fw-bold text-secondary mb-1">
                      Specialization
                    </label>
                    <Input
                      size="large"
                      name="specialization"
                      placeholder="e.g. Pediatric Cardiology"
                      value={formik.values.specialization}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      status={
                        formik.touched.specialization &&
                        formik.errors.specialization
                          ? "error"
                          : ""
                      }
                    />
                    {errorMessage("specialization")}
                  </Col>
                  <Col md={6}>
                    <label className="small fw-bold text-secondary mb-1">
                      Medical License Number
                    </label>
                    <Input
                      size="large"
                      name="licenseNumber"
                      value={formik.values.licenseNumber}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      status={
                        formik.touched.licenseNumber &&
                        formik.errors.licenseNumber
                          ? "error"
                          : ""
                      }
                    />
                    {errorMessage("licenseNumber")}
                  </Col>
                  <Col md={6}>
                    <label className="small fw-bold text-secondary mb-1">
                      Designation / Title
                    </label>
                    <Input
                      size="large"
                      name="designation"
                      placeholder="e.g. Head of Surgery"
                      value={formik.values.designation}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      status={
                        formik.touched.designation &&
                        formik.errors.designation
                          ? "error"
                          : ""
                      }
                    />
                    {errorMessage("designation")}
                  </Col>
                  <Col md={6}>
                    <label className="small fw-bold text-secondary mb-1">
                      Qualifications
                    </label>
                    <Input
                      size="large"
                      name="qualifications"
                      placeholder="e.g. MD, FACS"
                      value={formik.values.qualifications}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      status={
                        formik.touched.qualifications &&
                        formik.errors.qualifications
                          ? "error"
                          : ""
                      }
                    />
                    {errorMessage("qualifications")}
                  </Col>
                  <Col md={12}>
                    <label className="small fw-bold text-secondary mb-1">
                      Professional Description
                    </label>
                    <TextArea
                      rows={3}
                      name="description"
                      placeholder="Brief clinical biography..."
                      value={formik.values.description}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      status={
                        formik.touched.description &&
                        formik.errors.description
                          ? "error"
                          : ""
                      }
                    />
                    {errorMessage("description")}
                  </Col>
                </Row>
              </>
            ) : (
              <>
                <h6 className="fw-bold text-secondary border-bottom pb-2 mb-3">
                  Staff Assignment Details
                </h6>
                <Row className="g-3">
                  <Col md={6}>
                    <label className="small fw-bold text-secondary mb-1">
                      Assigned Ward
                    </label>
                    <Select
                      className="w-100"
                      size="large"
                      placeholder="None"
                      allowClear
                      value={formik.values.wardId || null}
                      onChange={(val) => formik.setFieldValue("wardId", val)}
                    />
                  </Col>
                  <Col md={6}>
                    <label className="small fw-bold text-secondary mb-1 d-block">
                      Joining Date
                    </label>
                    <DatePicker
                      className="w-100"
                      size="large"
                      value={
                        formik.values.joiningDate
                          ? dayjs(formik.values.joiningDate)
                          : null
                      }
                      onChange={(_, dateString) =>
                        formik.setFieldValue("joiningDate", dateString)
                      }
                    />
                  </Col>
                  <Col md={6}>
                    <label className="small fw-bold text-secondary mb-1">
                      Role
                    </label>
                    <Select
                      className="w-100"
                      size="large"
                      placeholder="Select Role..."
                      allowClear
                      value={formik.values.role || null}
                      onChange={(val) => formik.setFieldValue("role", val)}
                      options={staffRoleEnum}
                      onBlur={() => formik.setFieldTouched("role", true)}
                      status={
                        formik.touched.role && formik.errors.role
                          ? "error"
                          : ""
                      }
                    />
                    {errorMessage("role")}
                  </Col>
                </Row>
              </>
            )}
            </>}

            <h6 className="fw-bold text-dark border-bottom pb-2 mb-3 mt-4">
              Weekly Availability
            </h6>
            <WeeklyAvailabilityEditor
              value={formik.values.availability}
              onChange={(availability) =>
                formik.setFieldValue("availability", availability)
              }
            />

            {!editingId && <Row className="mt-4">
              <Col className="d-flex align-items-center gap-2">
                <Switch
                  checked={formik.values.isActive}
                  onChange={(checked) =>
                    formik.setFieldValue("isActive", checked)
                  }
                />
                <span className="fw-medium text-dark">Profile is Active</span>
              </Col>
            </Row>}
          </div>
        </Modal>
      </Container>
    </ConfigProvider>
  );
}



export default Staff;
