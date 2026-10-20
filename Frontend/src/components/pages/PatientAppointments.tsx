import { useState } from "react";
import { Alert, Button, Card, Form, Input, Skeleton, Space, Typography } from "antd";
import { ArrowLeft, CalendarDays, MapPin, ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import { toast } from "react-toastify";
import { getApiErrorMessage, lookupPublicAppointment } from "../../services/api";
import type { PublicAppointmentDetails } from "../../types/global.types";
import "../../styles/public-booking.scss";

export default function PatientAppointments() {
  const [appointment, setAppointment] = useState<PublicAppointmentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<{ bookingCode: string; email: string }>();

  const lookup = async (values: { bookingCode: string; email: string }) => {
    setLoading(true);
    setAppointment(null);
    try {
      setAppointment(await lookupPublicAppointment({ bookingCode: values.bookingCode.trim(), email: values.email.trim() }));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not find an appointment with those details"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="public-booking-page public-appointment-lookup-page">
      <header className="public-booking-header"><Link className="public-booking-brand" to="/">Care<span>Base</span></Link><Link to="/book-appointment"><ArrowLeft size={16} /> Find a doctor</Link></header>
      <section className="public-booking-hero lookup-hero"><div className="public-booking-eyebrow"><ShieldCheck size={15} /> PRIVATE PATIENT ACCESS</div><Typography.Title>My appointment</Typography.Title><Typography.Paragraph>Enter the private booking code from your confirmation email and the email address used to book.</Typography.Paragraph></section>
      <section className="public-lookup-content">
        <Card className="public-lookup-card">
          <Form form={form} layout="vertical" onFinish={(values) => void lookup(values)}>
            <Form.Item name="bookingCode" label="Private booking code" rules={[{ required: true, message: "Enter your booking code" }]}><Input autoComplete="one-time-code" /></Form.Item>
            <Form.Item name="email" label="Booking email" rules={[{ required: true, type: "email", message: "Enter the email used to book" }]}><Input autoComplete="email" /></Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>View appointment</Button>
          </Form>
          <Typography.Paragraph className="public-lookup-hint">Your booking code works like a private key. Keep it to yourself.</Typography.Paragraph>
        </Card>
        {loading && <Card className="public-lookup-result" title="Appointment details"><Skeleton active paragraph={{ rows: 5 }} /></Card>}
        {appointment && <Card className="public-lookup-result" title="Appointment details">
          <Alert type={appointment.status === "booked" ? "success" : "info"} showIcon message={appointment.status.replace("_", " ").toUpperCase()} />
          <Typography.Title level={4}>{appointment.Patient.firstName} {appointment.Patient.lastName}</Typography.Title>
          <div className="public-detail-row"><CalendarDays size={18} /><span>{formatPakistanDateTime(appointment.scheduledAt)} (Pakistan Standard Time)</span></div>
          <div className="public-detail-row"><strong>Doctor</strong><span>{appointment.DoctorProfile.User.name} · {appointment.DoctorProfile.specialization}</span></div>
          <div className="public-detail-row"><strong>Department</strong><span>{appointment.Department.name}</span></div>
          <div className="public-detail-row"><strong>Hospital</strong><span>{appointment.Tenant.name}</span></div>
          {(appointment.Tenant.address || appointment.Tenant.city || appointment.Tenant.state) && <div className="public-detail-row"><MapPin size={18} /><span>{[appointment.Tenant.address, appointment.Tenant.city, appointment.Tenant.state, appointment.Tenant.country].filter(Boolean).join(", ")}</span></div>}
          <div className="public-detail-row"><strong>Duration</strong><span>{appointment.durationMinutes} minutes</span></div>
          <Space wrap className="public-lookup-actions"><Link to="/book-appointment">Book another appointment</Link><Button onClick={() => { setAppointment(null); form.resetFields(); }}>Clear details</Button></Space>
        </Card>}
      </section>
      <footer className="public-booking-footer"><span>CareBase · Patient appointment access</span><Link to="/">CareBase home</Link></footer>
    </main>
  );
}

function formatPakistanDateTime(value: string) {
  return new Intl.DateTimeFormat("en-PK", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(value));
}
