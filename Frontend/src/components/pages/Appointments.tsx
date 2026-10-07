import { useEffect, useState } from "react";
import {
  Button,
  ConfigProvider,
  DatePicker,
  Dropdown,
  Empty,
  Input,
  InputNumber,
  Modal,
  Select,
  Spin,
  type MenuProps,
} from "antd";
import {
  CalendarDays,
  Clock3,
  MoreHorizontal,
  Plus,
  Printer,
  UserRound,
} from "lucide-react";
import dayjs, { type Dayjs } from "dayjs";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router";
import { selectCurrentUser } from "../../store/authSlice";
import type { AuthUser } from "../../types/auth";
import type {
  AppointmentDoctorOption,
  AppointmentRecord,
  AppointmentStatus,
  PatientOption,
} from "../../types/global.types";
import {
  createAppointment,
  getAppointmentOptions,
  getAppointments,
  getPatients,
  updateAppointment,
} from "../../services/api";
import "../../styles/appointments.scss";

type AppointmentTab = "booked" | "completed";

const statusLabels: Record<AppointmentStatus, string> = {
  booked: "Waiting",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

const statusOptions = [
  { value: "all", label: "All" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No show" },
];

const appointmentDate = (date: string) => dayjs(date).format("MMMM D, YYYY");
const appointmentTime = (date: string) => dayjs(date).format("h:mm A");
const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

function Appointments() {
  const location = useLocation();
  const navigate = useNavigate();
  const requestedPatient = (location.state as { patient?: PatientOption } | null)?.patient;
  const user = useSelector(selectCurrentUser) as AuthUser | null;
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [doctors, setDoctors] = useState<AppointmentDoctorOption[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>(() => requestedPatient ? [requestedPatient] : []);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AppointmentTab>("booked");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "all">("all");
  const [doctorFilter, setDoctorFilter] = useState<string>();
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [showForm, setShowForm] = useState(Boolean(requestedPatient));
  const [showDetails, setShowDetails] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRecord | null>(null);
  const [patientId, setPatientId] = useState<string | undefined>(requestedPatient?.id);
  const [doctorId, setDoctorId] = useState<string>();
  const [scheduledAt, setScheduledAt] = useState<Dayjs | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const effectiveStatus = statusFilter === "all" ? activeTab : statusFilter;

  useEffect(() => {
    if (!requestedPatient) return;
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, navigate, requestedPatient]);

  useEffect(() => {
    if (!user?.tenantId) return;

    getAppointmentOptions()
      .then(({ doctors: doctorOptions }) => setDoctors(doctorOptions))
      .catch(() => toast.error("Could not load doctors"));
  }, [user?.tenantId]);

  useEffect(() => {
    if (!user?.tenantId || !showForm) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setPatientsLoading(true);
      void (async () => {
        try {
          const search = patientSearch.trim() || undefined;
          const firstPage = await getPatients({ search, page: 1, limit: 100 });
          const remainingPages = await Promise.all(
            Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
              getPatients({ search, page: index + 2, limit: 100 }),
            ),
          );
          if (active) setPatients([...firstPage.items, ...remainingPages.flatMap((response) => response.items)]);
        } catch {
          if (active) toast.error("Could not load patients");
        } finally {
          if (active) setPatientsLoading(false);
        }
      })();
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [patientSearch, showForm, user?.tenantId]);

  useEffect(() => {
    if (!user?.tenantId) return;
    setLoading(true);

    getAppointments({
      status: effectiveStatus,
      doctorId: doctorFilter,
      from: selectedDate?.startOf("day").toISOString(),
      to: selectedDate?.endOf("day").toISOString(),
    })
      .then(setAppointments)
      .catch(() => toast.error("Could not load appointments"))
      .finally(() => setLoading(false));
  }, [activeTab, doctorFilter, effectiveStatus, selectedDate, user?.tenantId]);

  const resetForm = () => {
    setSelectedAppointment(null);
    setPatientId(undefined);
    setDoctorId(undefined);
    setScheduledAt(null);
    setDurationMinutes(30);
    setNotes("");
    setPatientSearch("");
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openReschedule = (appointment: AppointmentRecord) => {
    setSelectedAppointment(appointment);
    setPatientId(appointment.Patient.id);
    setDoctorId(appointment.DoctorProfile.id);
    setScheduledAt(dayjs(appointment.scheduledAt));
    setDurationMinutes(appointment.durationMinutes);
    setNotes(appointment.notes ?? "");
    setShowForm(true);
  };

  const submitAppointment = async () => {
    if (!scheduledAt || !doctorId || (!selectedAppointment && !patientId)) {
      toast.error("Choose a patient, doctor, and date and time");
      return;
    }
    if (scheduledAt.isBefore(dayjs())) {
      toast.error("Appointment time must be in the future");
      return;
    }

    setSaving(true);
    try {
      if (selectedAppointment) {
        const updated = await updateAppointment(selectedAppointment.id, {
          scheduledAt: scheduledAt.toISOString(),
          durationMinutes,
          version: selectedAppointment.version,
        });
        setAppointments((current) => current.map((item) => item.id === updated.id ? updated : item));
        toast.success("Appointment rescheduled");
      } else {
        const selectedDoctor = doctors.find((doctor) => doctor.id === doctorId);
        if (!selectedDoctor || !patientId) {
          toast.error("Choose a valid doctor and patient");
          return;
        }
        const created = await createAppointment({
          patientId,
          doctorId,
          departmentId: selectedDoctor.departmentId,
          scheduledAt: scheduledAt.toISOString(),
          durationMinutes,
          notes: notes.trim() || undefined,
        });
        setActiveTab("booked");
        setStatusFilter("all");
        setDoctorFilter(undefined);
        setSelectedDate(null);
        setAppointments((current) => [created, ...current].sort(
          (left, right) => dayjs(left.scheduledAt).valueOf() - dayjs(right.scheduledAt).valueOf(),
        ));
        toast.success("Appointment created");
      }
      setShowForm(false);
      resetForm();
    } catch (error: unknown) {
      console.log(error)
      const response = error as { response?: { data?: { message?: string }; status: number } };
      if(response.response?.status == 409){
        toast.error("Doctor is not available for this time stamp.")
      }else{

        toast.error(response.response?.data?.message || "Could not save appointment");
      }
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (appointment: AppointmentRecord, status: AppointmentStatus) => {
    try {
      const updated = await updateAppointment(appointment.id, { status, version: appointment.version });
      if (updated.status === effectiveStatus) {
        setAppointments((current) => current.map((item) => item.id === updated.id ? updated : item));
      } else {
        setAppointments((current) => current.filter((item) => item.id !== updated.id));
      }
      if (selectedAppointment?.id === updated.id) setSelectedAppointment(updated);
      toast.success(`Appointment marked ${statusLabels[status].toLowerCase()}`);
    } catch (error: unknown) {
      const response = error as { response?: { data?: { message?: string } } };
      toast.error(response.response?.data?.message || "Could not update appointment");
    }
  };

  const confirmCancel = (appointment: AppointmentRecord) => {
    Modal.confirm({
      title: "Cancel this appointment?",
      content: `${appointment.Patient.firstName} ${appointment.Patient.lastName} with ${appointment.DoctorProfile.User.name}`,
      okText: "Cancel appointment",
      okButtonProps: { danger: true },
      onOk: () => updateStatus(appointment, "cancelled"),
    });
  };

  const menuItems = (appointment: AppointmentRecord): MenuProps["items"] => [
    { key: "details", label: "View details", icon: <UserRound size={15} /> },
    ...(appointment.status === "booked"
      ? [
          { key: "reschedule", label: "Reschedule", icon: <CalendarDays size={15} /> },
          { key: "complete", label: "Mark completed" },
          { key: "no-show", label: "Mark no-show" },
          { type: "divider" as const },
          { key: "cancel", label: "Cancel appointment", danger: true },
        ]
      : []),
  ];

  const handleMenuClick = (appointment: AppointmentRecord, key: string) => {
    if (key === "details") {
      setSelectedAppointment(appointment);
      setShowDetails(true);
    } else if (key === "reschedule") {
      openReschedule(appointment);
    } else if (key === "complete") {
      void updateStatus(appointment, "completed");
    } else if (key === "no-show") {
      void updateStatus(appointment, "no_show");
    } else if (key === "cancel") {
      confirmCancel(appointment);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#0F766E", borderRadius: 8 } }}>
    <main className="appointments-page">
      <header className="appointments-header">
        <div>
          <p className="appointments-eyebrow">Care coordination</p>
          <h1>Appointments</h1>
          <p className="appointments-subtitle">Review bookings, schedules, and patient visits.</p>
        </div>
        <div className="appointments-header-actions">
          <Button icon={<Printer size={16} />} onClick={() => window.print()} aria-label="Print appointments">
            Print
          </Button>
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
            New appointment
          </Button>
        </div>
      </header>

      <section className="appointments-toolbar" aria-label="Appointment filters">
        <div className="appointments-tabs" role="tablist" aria-label="Appointment status">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "booked"}
            className={activeTab === "booked" ? "is-active" : ""}
            onClick={() => {
              setActiveTab("booked");
              setStatusFilter("all");
            }}
          >
            Just entered
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "completed"}
            className={activeTab === "completed" ? "is-active" : ""}
            onClick={() => {
              setActiveTab("completed");
              setStatusFilter("all");
            }}
          >
            Completed
          </button>
        </div>

        <div className="appointments-filters">
          <Select
            allowClear
            showSearch
            placeholder="All doctors"
            value={doctorFilter}
            onChange={setDoctorFilter}
            options={doctors.map((doctor) => ({
              value: doctor.id,
              label: doctor.User.name,
            }))}
            className="appointments-doctor-filter"
          />
          <DatePicker
            allowClear
            value={selectedDate}
            onChange={setSelectedDate}
            placeholder="Date and time"
            suffixIcon={<CalendarDays size={15} />}
          />
          <Select
            value={statusFilter}
            onChange={(value: AppointmentStatus | "all") => setStatusFilter(value)}
            options={statusOptions}
            className="appointments-status-filter"
          />
        </div>
      </section>

      {loading ? (
        <div className="appointments-loading"><Spin size="large" /></div>
      ) : appointments.length === 0 ? (
        <div className="appointments-empty">
          <Empty description="No appointments match these filters" />
        </div>
      ) : (
        <section className="appointment-grid" aria-label="Appointments">
          {appointments.map((appointment, index) => {
            const doctorName = appointment.DoctorProfile.User.name;
            return (
              <article className="appointment-card" key={appointment.id}>
                <div className="appointment-card-heading">
                  <div>
                    <h2>Appointment {index + 1}</h2>
                    <span className={`appointment-status status-${appointment.status}`}>
                      {statusLabels[appointment.status]}
                    </span>
                  </div>
                  <Dropdown
                    trigger={["click"]}
                    menu={{
                      items: menuItems(appointment),
                      onClick: ({ key }) => handleMenuClick(appointment, key),
                    }}
                    placement="bottomRight"
                  >
                    <button className="appointment-menu-button" type="button" aria-label="Appointment actions">
                      <MoreHorizontal size={18} />
                    </button>
                  </Dropdown>
                </div>

                <div className="appointment-doctor">
                  <span className="doctor-avatar">{getInitials(doctorName)}</span>
                  <div>
                    <strong>{doctorName}</strong>
                    <span>{appointment.DoctorProfile.designation || appointment.DoctorProfile.specialization}</span>
                  </div>
                </div>

                <dl className="appointment-meta">
                  <div>
                    <dt>Patient name</dt>
                    <dd>{appointment.Patient.firstName} {appointment.Patient.lastName}</dd>
                  </div>
                  <div>
                    <dt>Department</dt>
                    <dd>{appointment.Department.name}</dd>
                  </div>
                  <div>
                    <dt>Date &amp; time</dt>
                    <dd>{appointmentDate(appointment.scheduledAt)}, {appointmentTime(appointment.scheduledAt)}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </section>
      )}

      <Modal
        title={selectedAppointment ? "Reschedule appointment" : "New appointment"}
        open={showForm}
        onCancel={closeForm}
        onOk={() => void submitAppointment()}
        okText={selectedAppointment ? "Save new time" : "Create appointment"}
        confirmLoading={saving}
        destroyOnHidden
        zIndex={1100}
      >
        <div className="appointment-form">
          {!selectedAppointment && (
            <>
              <label htmlFor="appointment-patient">Patient</label>
              <Select
                id="appointment-patient"
                loading={patientsLoading}
                showSearch
                filterOption={false}
                onSearch={setPatientSearch}
                value={patientId}
                onChange={setPatientId}
                placeholder="Search by patient name or MRN"
                notFoundContent={patientsLoading ? <Spin size="small" /> : "No matching patients"}
                options={patients.map((patient) => ({
                  value: patient.id,
                  label: `${patient.firstName} ${patient.lastName} · ${patient.mrn}`,
                }))}
              />
              <label htmlFor="appointment-doctor">Doctor</label>
              <Select
                id="appointment-doctor"
                showSearch
                optionFilterProp="label"
                value={doctorId}
                onChange={setDoctorId}
                placeholder="Choose a doctor"
                options={doctors.map((doctor) => ({
                  value: doctor.id,
                  label: `${doctor.User.name} · ${doctor.Department.name}`,
                }))}
              />
            </>
          )}
          <label htmlFor="appointment-datetime">Date and time</label>
          <DatePicker
            id="appointment-datetime"
            showTime={{ format: "h:mm A", minuteStep: 15, use12Hours: true }}
            format="MMM D, YYYY h:mm A"
            disabledDate={(date) => date.isBefore(dayjs().startOf("day"))}
            value={scheduledAt}
            onChange={setScheduledAt}
            className="w-100"
            suffixIcon={<Clock3 size={15} />}
          />
          <label htmlFor="appointment-duration">Duration in minutes</label>
          <InputNumber
            id="appointment-duration"
            min={5}
            max={480}
            step={5}
            value={durationMinutes}
            onChange={(value) => setDurationMinutes(Number(value) || 30)}
            className="w-100"
          />
          {!selectedAppointment && (
            <>
              <label htmlFor="appointment-notes">Notes</label>
              <Input.TextArea
                id="appointment-notes"
                rows={3}
                maxLength={4000}
                showCount
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional visit notes"
              />
            </>
          )}
        </div>
      </Modal>

      <Modal
        zIndex={1100}
        title="Appointment details"
        open={showDetails}
        onCancel={() => setShowDetails(false)}
        footer={[
          <Button key="close" onClick={() => setShowDetails(false)}>Close</Button>,
          ...(selectedAppointment?.status === "booked"
            ? [<Button key="reschedule" type="primary" onClick={() => {
                if (selectedAppointment) openReschedule(selectedAppointment);
                setShowDetails(false);
              }}>Reschedule</Button>]
            : []),
        ]}
      >
        {selectedAppointment && (
          <div className="appointment-detail-list">
            <p><span>Status</span><strong>{statusLabels[selectedAppointment.status]}</strong></p>
            <p><span>Patient</span><strong>{selectedAppointment.Patient.firstName} {selectedAppointment.Patient.lastName}</strong></p>
            <p><span>Doctor</span><strong>{selectedAppointment.DoctorProfile.User.name}</strong></p>
            <p><span>Department</span><strong>{selectedAppointment.Department.name}</strong></p>
            <p><span>Date</span><strong>{appointmentDate(selectedAppointment.scheduledAt)}</strong></p>
            <p><span>Time</span><strong>{appointmentTime(selectedAppointment.scheduledAt)} ({selectedAppointment.durationMinutes} min)</strong></p>
            {selectedAppointment.notes && <p><span>Notes</span><strong>{selectedAppointment.notes}</strong></p>}
          </div>
        )}
      </Modal>
    </main>
    </ConfigProvider>
  );
}

export default Appointments;