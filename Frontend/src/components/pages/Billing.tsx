import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Alert, Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tabs, Tag, Typography } from "antd";
import type { TableProps } from "antd";
import { Printer, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { selectCurrentUser } from "../../store/authSlice";
import type { AuthUser } from "../../types/auth";
import type { BillingCategory, BillingInvoice, BillingRate } from "../../types/global.types";
import { addBillingInvoiceItem, collectBillingPayment, createAppointmentInvoice, createBillingRate, createInpatientInvoice, getApiErrorMessage, getBillableAdmissions, getBillableAppointments, getBillingInvoices, getBillingRates } from "../../services/api";
import "../../styles/billing.scss";

const { Title, Text } = Typography;
const categories: BillingCategory[] = ["appointment", "bed", "surgery", "consultation", "hospital_fee"];

export default function Billing() {
  const user = useSelector(selectCurrentUser) as AuthUser | null;
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [rates, setRates] = useState<BillingRate[]>([]);
  const [billableAppointments, setBillableAppointments] = useState<Array<{ id: string; scheduledAt: string; doctorId: string; Patient: { mrn: string; firstName: string; lastName: string }; DoctorProfile: { User: { name: string } } }>>([]);
  const [billableAdmissions, setBillableAdmissions] = useState<Array<{ id: string; admittedAt: string; Encounter: { Patient: { mrn: string; firstName: string; lastName: string } } }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<BillingInvoice | null>(null);
  const [rateForm] = Form.useForm();
  const [appointmentForm] = Form.useForm<{ appointmentId: string; rateId: string }>();
  const [inpatientForm] = Form.useForm<{ admissionId: string }>();
  const [chargeForm] = Form.useForm<{ rateId: string; quantity: number; description?: string }>();
  const [paymentForm] = Form.useForm<{ amount: number; method: "cash" | "card"; reference?: string }>();
  const canReadInvoices = Boolean(user?.permissions?.includes("*") || user?.permissions?.includes("billing:invoices:read"));
  const canRead = canReadInvoices || Boolean(user?.permissions?.includes("*") || user?.permissions?.includes("billing:rates:read"));
  const canWrite = Boolean(user?.permissions?.includes("*") || user?.permissions?.includes("billing:invoices:write"));
  const canRatesRead = Boolean(user?.permissions?.includes("*") || user?.permissions?.includes("billing:rates:read"));
  const canRates = Boolean(user?.permissions?.includes("*") || user?.permissions?.includes("billing:rates:write"));
  const canPay = Boolean(user?.permissions?.includes("*") || user?.permissions?.includes("billing:payments:write"));
  const selectedAppointmentId = Form.useWatch("appointmentId", appointmentForm);
  const selectedAppointment = billableAppointments.find((appointment) => appointment.id === selectedAppointmentId);
  const appointmentRates = rates.filter((rate) => rate.category === "appointment" && (!selectedAppointment || rate.doctorId === selectedAppointment.doctorId));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invoiceRows, rateRows, appointmentRows, admissionRows] = await Promise.all([
        canReadInvoices ? getBillingInvoices() : Promise.resolve([]),
        canRatesRead ? getBillingRates() : Promise.resolve([]),
        canReadInvoices ? getBillableAppointments() : Promise.resolve([]),
        canReadInvoices ? getBillableAdmissions() : Promise.resolve([]),
      ]);
      setInvoices(invoiceRows);
      setRates(rateRows);
      setBillableAppointments(appointmentRows);
      setBillableAdmissions(admissionRows);
      setSelectedInvoice((current) => invoiceRows.find((invoice) => invoice.id === current?.id) ?? null);
    } catch (error) { toast.error(getApiErrorMessage(error, "Could not load billing records")); }
    finally { setLoading(false); }
  }, [canRatesRead, canReadInvoices]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (canRead) void load();
      else setLoading(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [canRead, load]);

  const createRate = async (values: { code: string; name: string; category: BillingCategory; amount: number; taxRate: number; appointmentType?: string; procedureCode?: string }) => {
    setSaving(true);
    try { await createBillingRate(values); rateForm.resetFields(); toast.success("Billing rate created"); await load(); }
    catch (error) { toast.error(getApiErrorMessage(error, "Could not create billing rate")); }
    finally { setSaving(false); }
  };

  const createAppointment = async (values: { appointmentId: string; rateId: string }) => {
    setSaving(true);
    try { const invoice = await createAppointmentInvoice(values.appointmentId, values.rateId); appointmentForm.resetFields(); setSelectedInvoice(invoice); toast.success("Appointment invoice created"); await load(); }
    catch (error) { toast.error(getApiErrorMessage(error, "Could not create appointment invoice")); }
    finally { setSaving(false); }
  };

  const createInpatient = async (values: { admissionId: string }) => {
    setSaving(true);
    try { const invoice = await createInpatientInvoice(values.admissionId); inpatientForm.resetFields(); setSelectedInvoice(invoice); toast.success("Inpatient invoice opened"); await load(); }
    catch (error) { toast.error(getApiErrorMessage(error, "Could not open inpatient invoice")); }
    finally { setSaving(false); }
  };

  const addCharge = async (values: { rateId: string; quantity: number; description?: string }) => {
    if (!selectedInvoice) return;
    setSaving(true);
    try { const invoice = await addBillingInvoiceItem(selectedInvoice.id, values); setSelectedInvoice(invoice); chargeForm.resetFields(); toast.success("Charge added"); await load(); }
    catch (error) { toast.error(getApiErrorMessage(error, "Could not add charge")); }
    finally { setSaving(false); }
  };

  const collectPayment = async (values: { amount: number; method: "cash" | "card"; reference?: string }) => {
    if (!selectedInvoice) return;
    setSaving(true);
    try { const invoice = await collectBillingPayment(selectedInvoice.id, values); setSelectedInvoice(invoice); paymentForm.resetFields(); toast.success("Payment recorded"); await load(); }
    catch (error) { toast.error(getApiErrorMessage(error, "Could not record payment")); }
    finally { setSaving(false); }
  };

  const printInvoice = () => {
    document.body.classList.add("print-invoice-mode");
    const cleanup = () => document.body.classList.remove("print-invoice-mode");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1000);
  };

  if (!canRead) return <Alert type="warning" showIcon message="You do not have billing access." description="Ask an administrator to assign billing permissions to your role." />;

  const invoiceColumns: TableProps<BillingInvoice>["columns"] = [
    { title: "INVOICE", dataIndex: "invoiceNumber" },
    { title: "PATIENT", key: "patient", render: (_, invoice) => `${invoice.Patient.firstName} ${invoice.Patient.lastName} (${invoice.Patient.mrn})` },
    { title: "TYPE", dataIndex: "kind", render: (value) => <Tag>{value}</Tag> },
    { title: "TOTAL", dataIndex: "totalAmount", render: (value) => `PKR ${value.toFixed(2)}` },
    { title: "BALANCE", dataIndex: "balanceAmount", render: (value) => <Text type={value > 0 ? "danger" : "success"}>PKR {value.toFixed(2)}</Text> },
    { title: "STATUS", dataIndex: "status", render: (value) => <Tag color={value === "paid" ? "green" : value === "void" ? "red" : "gold"}>{value}</Tag> },
    { title: "ISSUED", dataIndex: "issuedAt", render: (value) => dayjs(value).format("MMM D, YYYY h:mm A") },
    { title: "ACTION", key: "action", render: (_, invoice) => <Button size="small" onClick={() => setSelectedInvoice(invoice)}>Open</Button> },
  ];

  return <Space direction="vertical" size="large" style={{ width: "100%", padding: 24 }}>
    <Space style={{ width: "100%", justifyContent: "space-between" }}><div><Title level={3} style={{ margin: 0 }}>Billing</Title><Text type="secondary">Appointments, inpatient charges, and payments.</Text></div><Button icon={<RefreshCw size={15} />} onClick={() => void load()} loading={loading}>Refresh</Button></Space>
    <Tabs items={[
      ...(canReadInvoices ? [{ key: "invoices", label: "Invoices", children: <Card><Table<BillingInvoice> rowKey="id" loading={loading} dataSource={invoices} columns={invoiceColumns} pagination={{ pageSize: 10 }} /></Card> }] : []),
      ...(canWrite ? [{ key: "create", label: "Create invoice", children: <Space direction="vertical" style={{ width: "100%" }}><Card title="Appointment invoice"><Form form={appointmentForm} layout="inline" onFinish={(values) => void createAppointment(values)}><Form.Item name="appointmentId" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" placeholder="Select appointment" style={{ width: 360 }} onChange={() => appointmentForm.setFieldValue("rateId", undefined)} options={billableAppointments.map((appointment) => ({ value: appointment.id, label: `${appointment.Patient.firstName} ${appointment.Patient.lastName} · ${appointment.Patient.mrn} · ${appointment.DoctorProfile.User.name} · ${dayjs(appointment.scheduledAt).format("MMM D")}` }))} /></Form.Item><Form.Item name="rateId" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" placeholder={selectedAppointment ? "Select doctor rate" : "Select appointment first"} disabled={!selectedAppointment} notFoundContent={selectedAppointment ? "No active appointment rate exists for this doctor." : "Select an appointment first"} options={appointmentRates.map((rate) => ({ value: rate.id, label: `${rate.name} · PKR ${rate.amount}` }))} /></Form.Item><Button type="primary" htmlType="submit" loading={saving}>Create appointment invoice</Button></Form></Card><Card title="Inpatient invoice"><Form form={inpatientForm} layout="inline" onFinish={(values) => void createInpatient(values)}><Form.Item name="admissionId" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" placeholder="Select admission" style={{ width: 360 }} options={billableAdmissions.map((admission) => ({ value: admission.id, label: `${admission.Encounter.Patient.firstName} ${admission.Encounter.Patient.lastName} · ${admission.Encounter.Patient.mrn} · ${dayjs(admission.admittedAt).format("MMM D")}` }))} /></Form.Item><Button type="primary" htmlType="submit" loading={saving}>Open inpatient invoice</Button></Form></Card></Space> }] : []),
      ...(canRatesRead ? [{ key: "rates", label: user?.role === "Doctor" ? "My appointment rates" : "Rate catalog", children: <Card><Form form={rateForm} layout="inline" onFinish={(values) => void createRate(values)}><Form.Item name="code" rules={[{ required: true }]}><Input placeholder="Code" /></Form.Item><Form.Item name="name" rules={[{ required: true }]}><Input placeholder="Rate name" /></Form.Item><Form.Item name="category" initialValue={user?.role === "Doctor" ? "appointment" : undefined} rules={[{ required: true }]}><Select disabled={user?.role === "Doctor"} placeholder="Category" options={categories.map((category) => ({ value: category, label: category }))} /></Form.Item>{user?.role === "Doctor" && <Form.Item name="appointmentType" rules={[{ required: true }]}><Input placeholder="Appointment type" /></Form.Item>}<Form.Item name="amount" rules={[{ required: true, type: "number", min: 0 }]}><InputNumber placeholder="Amount PKR" /></Form.Item><Form.Item name="taxRate" initialValue={0}><InputNumber placeholder="Tax %" min={0} /></Form.Item><Button type="primary" htmlType="submit" loading={saving} disabled={!canRates}>Add rate</Button></Form><Table rowKey="id" style={{ marginTop: 20 }} dataSource={rates} columns={[{ title: "CODE", dataIndex: "code" }, { title: "NAME", dataIndex: "name" }, { title: "CATEGORY", dataIndex: "category" }, { title: "AMOUNT", dataIndex: "amount", render: (value) => `PKR ${value}` }, { title: "TAX", dataIndex: "taxRate", render: (value) => `${value}%` }]} /></Card> }] : []),
    ]} />
    <Modal title={selectedInvoice ? selectedInvoice.invoiceNumber : "Invoice"} open={Boolean(selectedInvoice)} onCancel={() => setSelectedInvoice(null)} footer={null} width={800} className="invoice-modal">
      {selectedInvoice && <>
        <div className="invoice-print-actions"><Button icon={<Printer size={15} />} onClick={printInvoice}>Print invoice</Button></div>
        <section className="invoice-print">
          <header className="invoice-print-header"><div><span className="invoice-brand">CAREBASE</span><Title level={3}>Invoice</Title></div><div className="invoice-number"><Text type="secondary">Invoice number</Text><Text strong>{selectedInvoice.invoiceNumber}</Text><Text type="secondary">Issued {dayjs(selectedInvoice.issuedAt).format("MMM D, YYYY")}</Text></div></header>
          <div className="invoice-patient"><div><Text type="secondary">Billed to</Text><Text strong>{selectedInvoice.Patient.firstName} {selectedInvoice.Patient.lastName}</Text><Text>MRN: {selectedInvoice.Patient.mrn}</Text></div><Tag color={selectedInvoice.status === "paid" ? "green" : selectedInvoice.status === "void" ? "red" : "gold"}>{selectedInvoice.status.toUpperCase()}</Tag></div>
          <Table rowKey="id" pagination={false} dataSource={selectedInvoice.Items} columns={[{ title: "DESCRIPTION", dataIndex: "description" }, { title: "CATEGORY", dataIndex: "category", render: (value) => value.replaceAll("_", " ") }, { title: "QTY", dataIndex: "quantity" }, { title: "TOTAL", dataIndex: "totalAmount", render: (value) => `PKR ${value.toFixed(2)}` }]} />
          <div className="invoice-totals"><div><span>Total</span><strong>PKR {selectedInvoice.totalAmount.toFixed(2)}</strong></div><div><span>Paid</span><strong>PKR {selectedInvoice.paidAmount.toFixed(2)}</strong></div><div className="invoice-balance"><span>Balance due</span><strong>PKR {selectedInvoice.balanceAmount.toFixed(2)}</strong></div></div>
          <footer className="invoice-print-footer">CareBase · Hospital billing record</footer>
        </section>
        {canWrite && selectedInvoice.status !== "paid" && selectedInvoice.kind === "inpatient" && <Form className="invoice-edit-form" form={chargeForm} layout="inline" onFinish={(values) => void addCharge(values)}><Form.Item name="rateId" rules={[{ required: true }]}><Select placeholder="Charge rate" style={{ width: 220 }} options={rates.filter((rate) => rate.category !== "appointment").map((rate) => ({ value: rate.id, label: `${rate.name} · PKR ${rate.amount}` }))} /></Form.Item><Form.Item name="quantity" initialValue={1} rules={[{ required: true, type: "number", min: 0.01 }]}><InputNumber min={0.01} /></Form.Item><Button htmlType="submit" loading={saving}>Add charge</Button></Form>}
        {canPay && selectedInvoice.balanceAmount > 0 && selectedInvoice.totalAmount > 0 && <Form className="invoice-edit-form" form={paymentForm} layout="inline" onFinish={(values) => void collectPayment(values)}><Form.Item name="amount" initialValue={selectedInvoice.balanceAmount} rules={[{ required: true }]}><InputNumber min={0.01} precision={2} /></Form.Item><Form.Item name="method" initialValue="cash"><Select options={[{ value: "cash", label: "Cash" }, { value: "card", label: "Card" }]} /></Form.Item><Form.Item name="reference"><Input placeholder="Reference" /></Form.Item><Button type="primary" htmlType="submit" loading={saving}>Collect full payment</Button></Form>}
      </>}
    </Modal>
  </Space>;
}
