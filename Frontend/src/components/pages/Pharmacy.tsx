import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Alert,
  Button,
  Card,
  Col,
  ConfigProvider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import { AlertTriangle, Package, Plus, RefreshCw } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { toast } from "react-toastify";
import dayjs from "dayjs";

import { selectCurrentUser } from "../../store/authSlice";
import type { AuthUser } from "../../types/auth";
import type {
  ClinicalMedicine,
  PharmacyRecord,
  PharmacyStock,
  StockRequestRecord,
  StockRequestStatus,
  PharmacyDashboardData,
  StaffDirectoryEntry,
} from "../../types/global.types";
import {
  createClinicalMedicine,
  createPharmacy,
  createPharmacyStockTransaction,
  createStockRequest,
  createPharmacySale,
  getPharmacyDashboard,
  getAllStaff,
  assignPharmacist,
  getApiErrorMessage,
  getClinicalMedicines,
  getPharmacies,
  getStockRequests,
  updatePharmacy,
  updateStockRequestStatus,
  setClinicalMedicineActive,
} from "../../services/api";

const { Title, Text } = Typography;

interface MedicineFormValues {
  name: string;
  genericName?: string;
  form?: string;
  strength?: string;
  purchasePrice?: number;
  sellingPrice?: number;
}

interface StockFormValues {
  type: "IN" | "OUT";
  quantity: number;
  reason?: string;
  reorderLevel?: number;
}

interface RequestFormValues {
  requestingPharmacyId: string;
  fulfillingPharmacyId: string;
  medicineId: string;
  requestedQuantity: number;
  notes?: string;
}

interface SaleFormValues {
  customerName: string;
  customerPhone?: string;
  medicineId: string;
  quantity: number;
  paymentMethod: "cash" | "card" | "insurance";
}

interface ReceiptFormValues {
  [key: string]: number | undefined;
}

const themeConfig = {
  token: {
    colorPrimary: "#0F766E",
    colorInfo: "#0284C7",
    colorSuccess: "#16A34A",
    colorWarning: "#D97706",
    colorError: "#DC2626",
    colorTextBase: "#1E293B",
    colorBgLayout: "#F1F5F9",
    borderRadius: 8,
    fontFamily: '"Inter", sans-serif',
  },
};

const statusColor: Record<StockRequestStatus, string> = {
  pending: "gold",
  approved: "blue",
  rejected: "red",
  dispatched: "purple",
  received: "green",
  partially_received: "orange",
  not_received: "red",
};

export default function Pharmacy() {
  const user = useSelector(selectCurrentUser) as AuthUser | null;
  const [pharmacies, setPharmacies] = useState<PharmacyRecord[]>([]);
  const [medicines, setMedicines] = useState<ClinicalMedicine[]>([]);
  const [requests, setRequests] = useState<StockRequestRecord[]>([]);
  const [dashboard, setDashboard] = useState<PharmacyDashboardData | null>(null);
  const [staff, setStaff] = useState<StaffDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [stockMedicine, setStockMedicine] = useState<{ pharmacy: PharmacyRecord; stock: PharmacyStock | null; medicine: ClinicalMedicine } | null>(null);
  const [receiptRequest, setReceiptRequest] = useState<StockRequestRecord | null>(null);
  const [medicineForm] = Form.useForm<MedicineFormValues>();
  const [pharmacyForm] = Form.useForm<{ name: string; type: PharmacyRecord["type"] }>();
  const [stockForm] = Form.useForm<StockFormValues>();
  const [requestForm] = Form.useForm<RequestFormValues>();
  const [saleForm] = Form.useForm<SaleFormValues>();
  const [receiptForm] = Form.useForm<ReceiptFormValues>();

  const hasPermission = useCallback((permission: string) =>
    Boolean(user?.permissions?.includes("*") || user?.permissions?.includes(permission)), [user?.permissions]);
  const canRead = hasPermission("clinical:medicines:read");
  const canWrite = hasPermission("clinical:medicines:write");
  const isHead = ["owner", "admin", "head pharmacist", "head_pharmacist"].includes((user?.role ?? "").toLowerCase());
  const canManageWarehouse = isHead && canWrite;
  const assignedSubPharmacy = pharmacies.find((pharmacy) => pharmacy.type === "sub_store" && pharmacy.pharmacistUserId === user?.id);

  const load = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [pharmacyRows, medicineRows, requestRows, dashboardResult, staffRows] = await Promise.all([
        getPharmacies(),
        getClinicalMedicines(undefined, includeInactive),
        getStockRequests(),
        isHead ? getPharmacyDashboard() : Promise.resolve(null),
        isHead ? getAllStaff() : Promise.resolve([]),
      ]);
      setPharmacies(pharmacyRows);
      setMedicines(medicineRows);
      setRequests(requestRows);
      setDashboard(dashboardResult);
      setStaff(staffRows);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load pharmacy data"));
    } finally {
      setLoading(false);
    }
  }, [canRead, includeInactive, isHead]);

  useEffect(() => { void load(); }, [load]);

  const medicineStock = useMemo(() => {
    const totals = new Map<string, number>();
    pharmacies.forEach((pharmacy) => pharmacy.Stocks.forEach((stock) => {
      totals.set(stock.medicineId, (totals.get(stock.medicineId) ?? 0) + stock.currentStock);
    }));
    return totals;
  }, [pharmacies]);

  const lowStockRows = useMemo(() => pharmacies.flatMap((pharmacy) => pharmacy.Stocks
    .filter((stock) => stock.currentStock <= stock.reorderLevel)
    .map((stock) => ({ ...stock, pharmacyName: pharmacy.name }))), [pharmacies]);

  const refresh = async () => { await load(); };

  const addMedicine = async (values: MedicineFormValues) => {
    setSaving(true);
    try {
      await createClinicalMedicine({ name: values.name.trim(), genericName: values.genericName?.trim() || null, form: values.form?.trim() || null, strength: values.strength?.trim() || null, purchasePrice: values.purchasePrice ?? 0, sellingPrice: values.sellingPrice ?? 0 });
      medicineForm.resetFields();
      toast.success("Medicine added to the catalogue");
      await load();
    } catch (error) { toast.error(getApiErrorMessage(error, "Could not add medicine")); }
    finally { setSaving(false); }
  };

  const sellMedicine = async (values: SaleFormValues) => {
    if (!assignedSubPharmacy) return;
    setSaving(true);
    try {
      await createPharmacySale(assignedSubPharmacy.id, { customerName: values.customerName.trim(), customerPhone: values.customerPhone?.trim() || null, paymentMethod: values.paymentMethod, items: [{ medicineId: values.medicineId, quantity: values.quantity }] });
      saleForm.resetFields();
      toast.success("Sale recorded and stock updated");
      await load();
    } catch (error) { toast.error(getApiErrorMessage(error, "Could not record sale")); }
    finally { setSaving(false); }
  };

  const assignStaff = async (pharmacyId: string, pharmacistUserId: string | null) => {
    try {
      await assignPharmacist(pharmacyId, pharmacistUserId);
      toast.success("Pharmacist access updated");
      await load();
    } catch (error) { toast.error(getApiErrorMessage(error, "Could not assign pharmacist")); }
  };

  const addPharmacy = async (values: { name: string; type: PharmacyRecord["type"] }) => {
    setSaving(true);
    try {
      await createPharmacy({ name: values.name.trim(), type: values.type });
      pharmacyForm.resetFields();
      toast.success("Pharmacy location created");
      await load();
    } catch (error) { toast.error(getApiErrorMessage(error, "Could not create pharmacy location")); }
    finally { setSaving(false); }
  };

  const togglePharmacy = async (pharmacy: PharmacyRecord, isActive: boolean) => {
    try {
      await updatePharmacy(pharmacy.id, { isActive });
      toast.success(isActive ? "Pharmacy activated" : "Pharmacy deactivated");
      await load();
    } catch (error) { toast.error(getApiErrorMessage(error, "Could not update pharmacy")); }
  };

  const toggleMedicine = async (medicine: ClinicalMedicine, isActive: boolean) => {
    try {
      await setClinicalMedicineActive(medicine.id, isActive);
      toast.success(isActive ? "Medicine reactivated" : "Medicine deactivated");
      await load();
    } catch (error) { toast.error(getApiErrorMessage(error, "Could not update medicine")); }
  };

  const recordStock = async (values: StockFormValues) => {
    if (!stockMedicine) return;
    setSaving(true);
    try {
      await createPharmacyStockTransaction(stockMedicine.pharmacy.id, {
        medicineId: stockMedicine.medicine.id,
        type: values.type,
        quantity: values.quantity,
        reason: values.reason?.trim() || null,
        reorderLevel: values.reorderLevel,
      });
      stockForm.resetFields();
      toast.success(values.type === "IN" ? "Stock received" : "Stock dispensed");
      setStockMedicine(null);
      await load();
    } catch (error) { toast.error(getApiErrorMessage(error, "Could not record stock transaction")); }
    finally { setSaving(false); }
  };

  const submitRequest = async (values: RequestFormValues) => {
    setSaving(true);
    try {
      await createStockRequest({
        requestingPharmacyId: values.requestingPharmacyId,
        fulfillingPharmacyId: values.fulfillingPharmacyId,
        notes: values.notes?.trim() || null,
        items: [{ medicineId: values.medicineId, requestedQuantity: values.requestedQuantity }],
      });
      requestForm.resetFields();
      toast.success("Stock request submitted");
      await load();
    } catch (error) { toast.error(getApiErrorMessage(error, "Could not submit stock request")); }
    finally { setSaving(false); }
  };

  const changeRequest = async (request: StockRequestRecord, status: StockRequestStatus) => {
    setSaving(true);
    try {
      await updateStockRequestStatus(request.id, { status });
      toast.success(`Request ${status}`);
      await load();
    } catch (error) { toast.error(getApiErrorMessage(error, "Could not update stock request")); }
    finally { setSaving(false); }
  };

  const submitReceipt = async (values: ReceiptFormValues, status: "received" | "partially_received" | "not_received") => {
    if (!receiptRequest) return;
    setSaving(true);
    try {
      await updateStockRequestStatus(receiptRequest.id, {
        status,
        receiptNote: values.receiptNote as string | undefined,
        items: receiptRequest.Items.map((item) => ({ medicineId: item.medicineId, receivedQuantity: Number(values[`received_${item.id}`] ?? 0) })),
      });
      setReceiptRequest(null);
      receiptForm.resetFields();
      toast.success("Delivery receipt recorded");
      await load();
    } catch (error) { toast.error(getApiErrorMessage(error, "Could not record delivery receipt")); }
    finally { setSaving(false); }
  };

  const defaultStockPharmacy = pharmacies.find(({ type, isActive }) => type === "central_store" && isActive) ?? pharmacies.find(({ isActive }) => isActive);
  const catalogueColumns: TableProps<ClinicalMedicine>["columns"] = [
    { title: "NAME", dataIndex: "name", render: (name: string, medicine) => <Text strong>{name}{medicine.strength ? ` · ${medicine.strength}` : ""}</Text> },
    { title: "GENERIC NAME", dataIndex: "genericName", render: (value?: string | null) => value || "—" },
    { title: "FORM", dataIndex: "form", render: (value?: string | null) => value || "—" },
    { title: "TOTAL STOCK", key: "stock", render: (_, medicine) => <Tag color={(medicineStock.get(medicine.id) ?? 0) > 0 ? "green" : "red"}>{medicineStock.get(medicine.id) ?? 0} units</Tag> },
    ...(canManageWarehouse ? [{ title: "ACTIVE", dataIndex: "isActive", render: (active: boolean, medicine: ClinicalMedicine) => <Switch checked={active} onChange={(checked) => void toggleMedicine(medicine, checked)} /> }] : []),
    ...(canManageWarehouse ? [{ title: "STOCK", key: "manageStock", render: (_: unknown, medicine: ClinicalMedicine) => <Button type="link" disabled={!defaultStockPharmacy} onClick={() => defaultStockPharmacy && setStockMedicine({ pharmacy: defaultStockPharmacy, stock: defaultStockPharmacy.Stocks.find(({ medicineId }) => medicineId === medicine.id) ?? null, medicine })}>Manage stock</Button> }] : []),
  ];

  const requestColumns: TableProps<StockRequestRecord>["columns"] = [
    { title: "FROM", key: "from", render: (_, request) => request.RequestingPharmacy.name },
    { title: "TO", key: "to", render: (_, request) => request.FulfillingPharmacy.name },
    { title: "ITEMS", key: "items", render: (_, request) => request.Items.map((item) => `${item.Medicine.name} × ${item.approvedQuantity ?? item.requestedQuantity}`).join(", ") },
    { title: "STATUS", dataIndex: "status", render: (status: StockRequestStatus) => <Tag color={statusColor[status]}>{status.toUpperCase()}</Tag> },
    { title: "CREATED", dataIndex: "createdAt", render: (value: string) => dayjs(value).format("MMM D, YYYY h:mm A") },
    { title: "ACTION", key: "action", render: (_, request) => request.status === "pending" ? <Space><Button size="small" type="primary" onClick={() => void changeRequest(request, "approved")} loading={saving}>Approve</Button><Button size="small" danger onClick={() => void changeRequest(request, "rejected")} loading={saving}>Reject</Button></Space> : request.status === "approved" ? <Button size="small" onClick={() => void changeRequest(request, "dispatched")} loading={saving}>Dispatch</Button> : request.status === "dispatched" ? <Button size="small" type="primary" onClick={() => { receiptForm.resetFields(); setReceiptRequest(request); }} loading={saving}>Count delivery</Button> : null },
  ];

  if (!canRead) {
    return <Alert type="warning" showIcon message="You do not have pharmacy access." description="Ask a hospital administrator to grant medicine catalogue read permission." />;
  }

  const requestPharmacyOptions = pharmacies.filter((pharmacy) => pharmacy.isActive).map((pharmacy) => ({ value: pharmacy.id, label: pharmacy.name }));

  return (
    <ConfigProvider theme={themeConfig}>
      <div style={{ padding: 24, background: "#f8fafc", minHeight: "100%" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col><Title level={3} style={{ margin: 0 }}>Hospital Pharmacy</Title><Text type="secondary">Manage locations, medicine stock, and transfer requests.</Text></Col>
            <Col><Button icon={<RefreshCw size={15} />} onClick={() => void refresh()} loading={loading}>Refresh</Button></Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}><Card><Statistic title="Locations" value={pharmacies.length} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="Active locations" value={pharmacies.filter(({ isActive }) => isActive).length} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="Units in stock" value={pharmacies.reduce((sum, pharmacy) => sum + pharmacy.stockCount, 0)} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="Low stock alerts" value={lowStockRows.length} valueStyle={{ color: lowStockRows.length ? "#DC2626" : undefined }} prefix={<AlertTriangle size={17} />} /></Card></Col>
          </Row>
          <Tabs items={[
            {
              key: "overview", label: "Overview", children: <Row gutter={[16, 16]}>
                {isHead && dashboard && <Col xs={24}><Card title="Sales trend · last 30 days"><ResponsiveContainer width="100%" height={280}><LineChart data={dashboard.salesByDay}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><RechartsTooltip formatter={(value) => [`${Number(value).toFixed(2)}`, "Sales"]} /><Line type="monotone" dataKey="sales" stroke="#0F766E" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></Card></Col>}
                <Col xs={24} xl={14}><Card title="Low stock alerts"><Table rowKey={(row) => `${row.pharmacyId}-${row.medicineId}`} dataSource={lowStockRows} loading={loading} pagination={{ pageSize: 6 }} locale={{ emptyText: "Stock levels are healthy" }} columns={[{ title: "LOCATION", dataIndex: "pharmacyName" }, { title: "MEDICINE", key: "medicine", render: (_, row) => row.Medicine.name }, { title: "CURRENT", dataIndex: "currentStock", render: (value) => <Text type="danger" strong>{value}</Text> }, { title: "REORDER AT", dataIndex: "reorderLevel" }]} /></Card></Col>
                <Col xs={24} xl={10}><Card title="Request stock"><Form form={requestForm} layout="vertical" onFinish={(values) => void submitRequest(values)}><Form.Item name="requestingPharmacyId" label="Requesting location" rules={[{ required: true }]}><Select options={requestPharmacyOptions} /></Form.Item><Form.Item name="fulfillingPharmacyId" label="Fulfil from" rules={[{ required: true }]}><Select options={requestPharmacyOptions} /></Form.Item><Form.Item name="medicineId" label="Medicine" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={medicines.filter(({ isActive }) => isActive).map((medicine) => ({ value: medicine.id, label: `${medicine.name}${medicine.strength ? ` · ${medicine.strength}` : ""}` }))} /></Form.Item><Form.Item name="requestedQuantity" label="Quantity" rules={[{ required: true, type: "number", min: 1 }]}><InputNumber min={1} style={{ width: "100%" }} /></Form.Item><Form.Item name="notes" label="Notes"><Input.TextArea maxLength={2000} rows={2} /></Form.Item><Button type="primary" htmlType="submit" loading={saving} disabled={!canWrite}>Submit request</Button></Form></Card></Col>
              </Row>,
            },
            {
              key: "locations", label: "Locations", children: <Space direction="vertical" style={{ width: "100%" }} size="middle"><Card title="Add pharmacy location" extra={<Plus size={18} />}><Form form={pharmacyForm} layout="inline" onFinish={(values) => void addPharmacy(values)}><Form.Item name="name" rules={[{ required: true }]}><Input placeholder="Location name" /></Form.Item><Form.Item name="type" initialValue="sub_store" rules={[{ required: true }]}><Select style={{ width: 170 }} options={[{ value: "central_store", label: "Central store" }, { value: "sub_store", label: "Sub store" }]} /></Form.Item><Button type="primary" htmlType="submit" loading={saving} disabled={!canManageWarehouse}>Add location</Button></Form><Text type="secondary">Only locations stored in the hospital database appear here.</Text></Card><Row gutter={[16, 16]}>{pharmacies.map((pharmacy) => <Col xs={24} md={12} xl={8} key={pharmacy.id}><Card title={pharmacy.name} extra={<Switch checked={pharmacy.isActive} onChange={(checked) => void togglePharmacy(pharmacy, checked)} disabled={!canManageWarehouse} />}><Space direction="vertical" style={{ width: "100%" }}><Tag>{pharmacy.type === "central_store" ? "Central store" : "Sub store"}</Tag>{isHead && <Select allowClear value={pharmacy.pharmacistUserId ?? undefined} placeholder="Assign pharmacist" options={staff.filter((member) => member.role.toLowerCase().includes("pharmacist")).map((member) => ({ value: member.userId, label: member.name }))} onChange={(value) => void assignStaff(pharmacy.id, value ?? null)} style={{ width: "100%" }} />}<Text><Package size={14} /> {pharmacy.stockCount} units across {pharmacy.Stocks.length} medicines</Text><Text type={pharmacy.lowStockCount ? "danger" : "secondary"}>{pharmacy.lowStockCount} low stock alerts</Text>{pharmacy.Stocks.slice(0, 5).map((stock) => <Button key={stock.id} type="link" style={{ padding: 0, textAlign: "left" }} disabled={!canManageWarehouse || pharmacy.type !== "central_store"} onClick={() => setStockMedicine({ pharmacy, stock, medicine: stock.Medicine })}>{stock.Medicine.name}: {stock.currentStock} units · Manage stock</Button>)}</Space></Card></Col>)}</Row></Space>,
            },
            {
              key: "catalogue", label: "Medicine catalogue", children: <Card title="Medicine catalogue" extra={<Space><Switch checked={includeInactive} onChange={setIncludeInactive} /><Text>Show inactive</Text></Space>}>{canManageWarehouse && <Form form={medicineForm} layout="inline" onFinish={(values) => void addMedicine(values)} style={{ marginBottom: 16 }}><Form.Item name="name" rules={[{ required: true }]}><Input placeholder="Medicine name" /></Form.Item><Form.Item name="genericName"><Input placeholder="Generic name" /></Form.Item><Form.Item name="form"><Input placeholder="Form" /></Form.Item><Form.Item name="strength"><Input placeholder="Strength" /></Form.Item><Form.Item name="purchasePrice"><InputNumber min={0} precision={2} placeholder="Purchase price" /></Form.Item><Form.Item name="sellingPrice"><InputNumber min={0} precision={2} placeholder="Selling price" /></Form.Item><Button type="primary" htmlType="submit" loading={saving}>Add medicine</Button></Form>}<Table<ClinicalMedicine> rowKey="id" loading={loading} dataSource={medicines} columns={catalogueColumns} pagination={{ pageSize: 8 }} /></Card>,
            },
            {
              key: "sales", label: "Sell medicines", children: assignedSubPharmacy ? <Card title={`Sell from ${assignedSubPharmacy.name}`}><Form form={saleForm} layout="vertical" onFinish={(values) => void sellMedicine(values)}><Form.Item name="customerName" label="Customer name" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="customerPhone" label="Customer phone"><Input /></Form.Item><Form.Item name="medicineId" label="Medicine" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={assignedSubPharmacy.Stocks.filter(({ currentStock }) => currentStock > 0).map((stock) => ({ value: stock.medicineId, label: `${stock.Medicine.name} · ${stock.currentStock} available · ${stock.Medicine.sellingPrice}` }))} /></Form.Item><Form.Item name="quantity" label="Quantity" rules={[{ required: true, type: "number", min: 1 }]}><InputNumber min={1} style={{ width: "100%" }} /></Form.Item><Form.Item name="paymentMethod" label="Payment" initialValue="cash"><Select options={[{ value: "cash", label: "Cash" }, { value: "card", label: "Card" }, { value: "insurance", label: "Insurance" }]} /></Form.Item><Button type="primary" htmlType="submit" loading={saving}>Record sale</Button></Form></Card> : <Alert type="info" message="No sub-pharmacy is assigned to your account." description="A head pharmacist must assign you to a sub-pharmacy before you can sell medicines." />,
            },
            {
              key: "requests", label: `Stock requests (${requests.length})`, children: <Card><Table<StockRequestRecord> rowKey="id" loading={loading} dataSource={requests} columns={requestColumns} pagination={{ pageSize: 8 }} /></Card>,
            },
          ]} />
        </Space>
        <Modal title={stockMedicine ? `Manage stock · ${stockMedicine.medicine.name}` : "Manage stock"} open={Boolean(stockMedicine)} onCancel={() => setStockMedicine(null)} footer={null} destroyOnClose>
          {stockMedicine && <Form form={stockForm} layout="vertical" onFinish={(values) => void recordStock(values)}><Text type="secondary">{stockMedicine.pharmacy.name} currently has {stockMedicine.stock?.currentStock ?? 0} units.</Text><Form.Item name="type" label="Movement" initialValue="IN" rules={[{ required: true }]}><Select options={[{ value: "IN", label: "Stock received" }, { value: "OUT", label: "Dispensed" }]} /></Form.Item><Form.Item name="quantity" label="Quantity" rules={[{ required: true, type: "number", min: 1 }]}><InputNumber min={1} precision={0} style={{ width: "100%" }} /></Form.Item><Form.Item name="reorderLevel" label="Reorder level"><InputNumber min={0} precision={0} style={{ width: "100%" }} placeholder={String(stockMedicine.stock?.reorderLevel ?? 10)} /></Form.Item><Form.Item name="reason" label="Reason"><Input.TextArea maxLength={1000} rows={2} /></Form.Item><Button type="primary" htmlType="submit" loading={saving} disabled={!canManageWarehouse}>Record movement</Button></Form>}
        </Modal>
        <Modal title={receiptRequest ? `Count delivery · ${receiptRequest.RequestingPharmacy.name}` : "Count delivery"} open={Boolean(receiptRequest)} onCancel={() => setReceiptRequest(null)} footer={null} destroyOnClose>
          {receiptRequest && <Form form={receiptForm} layout="vertical"><Text type="secondary">Enter the physical quantity received for each medicine.</Text>{receiptRequest.Items.map((item) => <Form.Item key={item.id} name={`received_${item.id}`} label={`${item.Medicine.name} (approved: ${item.approvedQuantity ?? item.requestedQuantity})`} initialValue={item.approvedQuantity ?? item.requestedQuantity} rules={[{ required: true, type: "number", min: 0 }]}><InputNumber min={0} precision={0} style={{ width: "100%" }} /></Form.Item>)}<Form.Item name="receiptNote" label="Receipt note"><Input.TextArea rows={2} maxLength={2000} placeholder="Explain shortages or non-receipt" /></Form.Item><Space><Button onClick={() => void receiptForm.validateFields().then((values) => submitReceipt(values, "not_received"))} danger loading={saving}>Not received</Button><Button onClick={() => void receiptForm.validateFields().then((values) => submitReceipt(values, "partially_received"))} loading={saving}>Partially received</Button><Button type="primary" onClick={() => void receiptForm.validateFields().then((values) => submitReceipt(values, "received"))} loading={saving}>Received in full</Button></Space></Form>}
        </Modal>
      </div>
    </ConfigProvider>
  );
}
