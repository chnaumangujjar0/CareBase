import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, DatePicker, Empty, Form, Input, Modal, Skeleton, Space, Tag, Typography } from "antd";
import { ArrowRight, CalendarDays, MapPin, Search, ShieldCheck } from "lucide-react";
import dayjs, { type Dayjs } from "dayjs";
import { toast } from "react-toastify";
import { Link } from "react-router";
import { createPublicAppointment, getApiErrorMessage, getPublicDoctorSlots, getPublicDoctors } from "../../services/api";
import type { PublicAppointmentResult, PublicAppointmentSlot, PublicDoctor } from "../../types/global.types";
import { createPublicBookingSocket, type PublicBookingSocket } from "../../services/publicBookingSocket";
import "../../styles/public-booking.scss";
import Logo from "../../assets/carebase-logo-full.svg";
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type BookingValues = { firstName: string; lastName: string; dob: Dayjs; email: string; phone?: string };

export default function PublicAppointmentBooking() {
  const [doctors, setDoctors] = useState<PublicDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalDoctors, setTotalDoctors] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [hospital, setHospital] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<PublicDoctor | null>(null);
  const [slots, setSlots] = useState<PublicAppointmentSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<PublicAppointmentSlot | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [booking, setBooking] = useState(false);
  const [result, setResult] = useState<PublicAppointmentResult | null>(null);
  const [form] = Form.useForm<BookingValues>();
  const selectedSlotRef = useRef<PublicAppointmentSlot | null>(null);
  const slotsRequestRef = useRef(0);

  useEffect(() => { selectedSlotRef.current = selectedSlot; }, [selectedSlot]);

  const loadDoctors = useCallback(async (targetPage = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const response = await getPublicDoctors({ q: search.trim() || undefined, hospital: hospital.trim() || undefined, page: targetPage, limit: 24 });
      setDoctors((current) => append ? [...current, ...response.items] : response.items);
      setTotalDoctors(response.total);
      setPage(response.page);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load available doctors"));
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, [search, hospital]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDoctors(), 250);
    return () => window.clearTimeout(timer);
  }, [loadDoctors]);

  const loadSlots = async (doctor: PublicDoctor) => {
    const requestId = ++slotsRequestRef.current;
    setSelectedDoctor(doctor);
    setShowBookingForm(false);
    setSelectedSlot(null);
    setSlots([]);
    setSlotsLoading(true);
    try {
      const nextSlots = await getPublicDoctorSlots(doctor.id, { days: 14 });
      if (requestId === slotsRequestRef.current) setSlots(nextSlots);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load appointment times"));
    } finally {
      if (requestId === slotsRequestRef.current) setSlotsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedDoctor) return;
    let active = true;
    let socket: PublicBookingSocket | null = null;
    const doctorId = selectedDoctor.id;
    const onSlotsChanged = async (event: { doctorId: string }) => {
      if (!active || event.doctorId !== doctorId) return;
      const requestId = ++slotsRequestRef.current;
      try {
        const updatedSlots = await getPublicDoctorSlots(doctorId, { days: 14 });
        if (!active || requestId !== slotsRequestRef.current) return;
        setSlots(updatedSlots);
        const selected = selectedSlotRef.current;
        if (selected && !updatedSlots.find((slot) => slot.startsAt === selected.startsAt)?.available) {
          selectedSlotRef.current = null;
          setSelectedSlot(null);
          setShowBookingForm(false);
          toast.info("That time was just booked. Please choose another available time.");
        }
      } catch {
        // The booking endpoint remains authoritative if a refresh fails.
      }
    };
    void createPublicBookingSocket().then((connectedSocket) => {
      if (!active) return;
      socket = connectedSocket;
      socket.on("public:slots:changed", onSlotsChanged);
      socket.connect();
      socket.emit("public:slots:subscribe", { doctorId });
    }).catch(() => {
      // Keep booking usable when live updates cannot connect.
    });
    return () => {
      active = false;
      if (socket) {
        socket.off("public:slots:changed", onSlotsChanged);
        socket.emit("public:slots:unsubscribe", { doctorId });
        socket.disconnect();
      }
    };
  }, [selectedDoctor]);

  const groupedSlots = useMemo(() => slots.reduce<Record<string, PublicAppointmentSlot[]>>((groups, slot) => {
    (groups[slot.localDate] ??= []).push(slot);
    return groups;
  }, {}), [slots]);

  const submitBooking = async (values: BookingValues) => {
    if (!selectedDoctor || !selectedSlot) return;
    setBooking(true);
    try {
      const bookingResult = await createPublicAppointment({
        doctorId: selectedDoctor.id,
        scheduledAt: selectedSlot.startsAt,
        firstName: values.firstName,
        lastName: values.lastName,
        dob: values.dob.format("YYYY-MM-DD"),
        email: values.email,
        phone: values.phone,
      });
      setResult(bookingResult);
      setSelectedDoctor(null);
      setSelectedSlot(null);
      setShowBookingForm(false);
      form.resetFields();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not book this appointment"));
      await loadSlots(selectedDoctor);
    } finally {
      setBooking(false);
    }
  };

  return (
    <main className="public-booking-page">
      <header className="public-booking-header">
        <Link to="/"><img src={Logo}></img></Link>
        <Space wrap className="public-booking-header-links">
          <Link className="public-booking-nav-link" to="/">Home</Link>
          <Link className="public-booking-nav-link" to="/my-appointments">Appointment</Link>
        </Space>
      </header>
      <section className="public-booking-hero">
        <div className="public-booking-eyebrow"><CalendarDays size={15} /> PUBLIC APPOINTMENT BOOKING</div>
        <Typography.Title>Find a doctor and book a visit</Typography.Title>
        <Typography.Paragraph>Compare doctors at participating hospitals and choose an available time. You can book without creating a CareBase account.</Typography.Paragraph>
        <div className="public-privacy-note"><ShieldCheck size={17} /> Your appointment details stay private. A booking code sent to your email lets you view your appointment.</div>
      </section>

      <section className="public-booking-content">
        <Form layout="vertical" className="public-doctor-search" onFinish={() => void loadDoctors(1)}>
          <Form.Item label="Doctor, specialty, department, or hospital" style={{ flex: 1, marginBottom: 0 }}>
            <Input prefix={<Search size={16} />} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search doctors or hospitals" onPressEnter={() => void loadDoctors(1)} allowClear />
          </Form.Item>
          <Form.Item label="Hospital" style={{ flex: 1, marginBottom: 0 }}>
            <Input value={hospital} onChange={(event) => setHospital(event.target.value)} placeholder="Any hospital" onPressEnter={() => void loadDoctors(1)} allowClear />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} icon={<Search size={16} />}>Search</Button>
        </Form>

        {!loading && totalDoctors > 0 && <Typography.Text className="public-results-count">{totalDoctors} doctor{totalDoctors === 1 ? "" : "s"} available</Typography.Text>}
        {loading ? <div className="public-doctor-grid">{[1, 2, 3].map((item) => <Card key={item}><Skeleton active /></Card>)}</div> : doctors.length === 0 ? <Empty className="public-empty" description="No available doctors found" /> : (
          <div className="public-doctor-grid">
            {doctors.map((doctor) => {
              const location = [doctor.Tenant.city, doctor.Tenant.state, doctor.Tenant.country].filter(Boolean).join(", ");
              return (
                <Card className="public-doctor-card" key={doctor.id}>
                  <div className="public-doctor-card-head">
                    <div className="public-doctor-avatar">{doctor.User.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div>
                    <div><Typography.Title level={4}>{doctor.User.name}</Typography.Title><Typography.Text type="secondary">{doctor.designation || doctor.specialization}</Typography.Text></div>
                  </div>
                  <div className="public-doctor-tags"><Tag color="cyan">{doctor.Department.name}</Tag>{doctor.qualifications && <Tag>{doctor.qualifications}</Tag>}</div>
                  <div className="public-doctor-hospital"><strong>{doctor.Tenant.name}</strong>{location && <span><MapPin size={14} /> {location}</span>}</div>
                  <div className="public-availability">
                    <span>Weekly availability</span>
                    <div>{doctor.DoctorAvailability.length ? doctor.DoctorAvailability.slice(0, 4).map((window, index) => <Tag key={`${window.dayOfWeek}-${window.startMinute}-${index}`}>{weekdays[window.dayOfWeek]} · {formatMinute(window.startMinute)}–{formatMinute(window.endMinute)}</Tag>) : <Typography.Text type="secondary">No schedule published</Typography.Text>}</div>
                  </div>
                  <Button type="primary" block onClick={() => void loadSlots(doctor)}>View available times <ArrowRight size={16} /></Button>
                </Card>
              );
            })}
          </div>
        )}
        {!loading && doctors.length < totalDoctors && <div className="public-load-more"><Button loading={loadingMore} onClick={() => void loadDoctors(page + 1, true)}>Load more doctors</Button></div>}
      </section>

      <footer className="public-booking-footer"><span>CareBase · Patient appointment access</span><Link to="/my-appointments">Already booked? View your appointment</Link></footer>

      <Modal open={Boolean(selectedDoctor && !showBookingForm)} title={selectedDoctor ? `Available times · ${selectedDoctor.User.name}` : "Available times"} onCancel={() => { setSelectedDoctor(null); setSelectedSlot(null); }} footer={null} width={680} destroyOnClose>
        {slotsLoading ? <Skeleton active /> : slots.length === 0 ? <Empty description="No appointment times are available in the next 14 days" /> : (
          <div className="public-slot-list">
            {Object.entries(groupedSlots).map(([date, daySlots]) => <div className="public-slot-day" key={date}><strong>{dayjs(date).format("dddd, MMMM D")}</strong><div>{daySlots.map((slot) => <Button key={slot.startsAt} disabled={!slot.available} title={slot.available ? undefined : "Unavailable"} type={selectedSlot?.startsAt === slot.startsAt ? "primary" : "default"} onClick={() => setSelectedSlot(slot)}>{slot.localTime}{slot.available ? "" : " · Unavailable"}</Button>)}</div></div>)}
          </div>
        )}
        {selectedSlot && <Alert className="public-slot-selected" type="info" showIcon message={`${dayjs(selectedSlot.localDate).format("MMM D")} at ${selectedSlot.localTime} PKT`} />}
        <Button className="public-slot-continue" type="primary" disabled={!selectedSlot} onClick={() => setShowBookingForm(true)}>Continue with this time</Button>
      </Modal>

      <Modal open={Boolean(showBookingForm && selectedSlot && selectedDoctor)} title="Your appointment details" onCancel={() => { setShowBookingForm(false); }} footer={null} destroyOnClose>
        <p className="public-form-intro">{selectedDoctor?.Tenant.name} · {selectedDoctor?.User.name} · {selectedSlot && `${dayjs(selectedSlot.localDate).format("MMM D")} at ${selectedSlot.localTime} PKT`}</p>
        <Form form={form} layout="vertical" onFinish={(values) => void submitBooking(values)}>
          <div className="public-form-name-row"><Form.Item name="firstName" label="First name" rules={[{ required: true, whitespace: true, message: "Enter your first name" }]}><Input autoComplete="given-name" maxLength={100} /></Form.Item><Form.Item name="lastName" label="Last name" rules={[{ required: true, whitespace: true, message: "Enter your last name" }]}><Input autoComplete="family-name" maxLength={100} /></Form.Item></div>
          <Form.Item name="dob" label="Date of birth" rules={[{ required: true, message: "Select your date of birth" }]}><DatePicker className="public-full-width" disabledDate={(date) => date.isAfter(dayjs(), "day")} /></Form.Item>
          <Form.Item name="email" label="Email for your private booking code" rules={[{ required: true, type: "email", message: "Enter a valid email address" }]}><Input autoComplete="email" /></Form.Item>
          <Form.Item name="phone" label="Phone (optional)" rules={[{ pattern: /^\+?[\d\s()-]{7,32}$/, message: "Enter a valid phone number" }]}><Input autoComplete="tel" maxLength={32} /></Form.Item>
          <Alert showIcon type="info" message="Your details are shared with the hospital for appointment management. No CareBase account is created." />
          <Button className="public-submit-booking" type="primary" htmlType="submit" loading={booking} block>Book appointment</Button>
        </Form>
      </Modal>

      <Modal open={Boolean(result)} title="Appointment booked" onCancel={() => setResult(null)} footer={<Button type="primary" onClick={() => setResult(null)}>Done</Button>} destroyOnClose>
        {result && <div className="public-confirmation"><Alert type="success" showIcon message="Your appointment is booked" description={`${result.appointment.hospitalName} · Dr. ${result.appointment.doctorName} · ${formatPakistanDateTime(result.appointment.scheduledAt)}`} /><p>Your private booking code</p><code>{result.bookingCode}</code><Typography.Paragraph>Save this code and use it with your email to view your appointment. {result.emailSent ? "We also sent it to your email." : "We could not send the confirmation email, so save this code now."}</Typography.Paragraph><Link to="/my-appointments">View patient appointment dashboard</Link></div>}
      </Modal>
    </main>
  );
}

function formatMinute(value: number) {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatPakistanDateTime(value: string) {
  return `${new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(value))} PKT`;
}
