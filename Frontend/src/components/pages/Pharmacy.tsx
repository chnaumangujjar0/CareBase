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
import { AlertTriangle, ArrowRightLeft, Package, Plus, Printer, RefreshCw, Trash2 } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import PageSkeleton from "../common/PageSkeleton";
import { appTheme } from "../../theme";

import { selectCurrentUser } from "../../store/authSlice";
import type { AuthUser } from "../../types/auth";
import type {
  ClinicalMedicine,
  PharmacyRecord,
  PharmacyStock,
  StockRequestRecord,
  StockRequestStatus,
  PharmacyDashboardData,
  PharmacySaleRecord,
} from "../../types/global.types";
import {
  createClinicalMedicine,
  createPharmacy,
  createPharmacyStockTransaction,
  createStockRequest,
  createPharmacySale,
  getPharmacyDashboard,
  getPharmacists,
  assignPharmacist,
  getApiErrorMessage,
  getClinicalMedicines,
  getPharmacies,
  getStockRequests,
  updatePharmacy,
  updateStockRequestStatus,
  setClinicalMedicineActive,
  transferWarehouseStock,
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
  items: Array<{ medicineId: string; quantity: number }>;
  paymentMethod: "cash" | "card" | "insurance";
}

interface ReceiptFormValues {
  [key: string]: number | undefined;
}

interface TransferFormValues {
  destinationPharmacyId: string;
  quantity: number;
  reason?: string;
}

interface PharmacyUser {
  userId: string;
  name: string;
  email: string;
  role: string;
}

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
  const [staff, setStaff] = useState<PharmacyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [medicineSearch, setMedicineSearch] = useState("");
  const [stockMedicine, setStockMedicine] = useState<{ pharmacy: PharmacyRecord; stock: PharmacyStock | null; medicine: ClinicalMedicine } | null>(null);
  const [transferMedicine, setTransferMedicine] = useState<ClinicalMedicine | null>(null);
  const [receiptRequest, setReceiptRequest] = useState<StockRequestRecord | null>(null);
  const [completedSale, setCompletedSale] = useState<PharmacySaleRecord | null>(null);
  const [medicineForm] = Form.useForm<MedicineFormValues>();
  const [pharmacyForm] = Form.useForm<{ name: string; type: PharmacyRecord["type"] }>();
  const [stockForm] = Form.useForm<StockFormValues>();
  const [requestForm] = Form.useForm<RequestFormValues>();
  const [saleForm] = Form.useForm<SaleFormValues>();
  const [receiptForm] = Form.useForm<ReceiptFormValues>();
  const [transferForm] = Form.useForm<TransferFormValues>();
  const saleItems = Form.useWatch("items", saleForm) ?? [];

  const hasPermission = useCallback((permission: string) =>
    Boolean(user?.permissions?.includes("*") || user?.permissions?.includes(permission)), [user?.permissions]);
  const canRead = hasPermission("clinical:medicines:read");
  const canWrite = hasPermission("clinical:medicines:write");
  const isHead = ["owner", "admin", "head pharmacist"].includes((user?.role ?? "").toLowerCase().replaceAll("_", " ").trim());
  const canManageWarehouse = isHead && canWrite;
  const assignedSubPharmacy = pharmacies.find((pharmacy) => pharmacy.type === "sub_store" && pharmacy.pharmacistUserId === user?.id);
  const centralWarehouse = pharmacies.find((pharmacy) => pharmacy.type === "central_store" && pharmacy.isActive);
  const assignedStockRows = assignedSubPharmacy?.Stocks ?? [];

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
        isHead ? getPharmacists() : Promise.resolve([]),
      ]);
      setPharmacies(pharmacyRows);
      setMedicines(medicineRows);
      setRequests(requestRows);
      setDashboard(dashboardResult);
      setStaff(staffRows);
      if (!isHead) {
        const assigned = pharmacyRows.find((pharmacy) => pharmacy.type === "sub_store" && pharmacy.pharmacistUserId === user?.id);
        const warehouse = pharmacyRows.find((pharmacy) => pharmacy.type === "central_store" && pharmacy.isActive);
        if (assigned) requestForm.setFieldValue("requestingPharmacyId", assigned.id);
        if (warehouse) requestForm.setFieldValue("fulfillingPharmacyId", warehouse.id);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load pharmacy data"));
    } finally {
      setLoading(false);
    }
  }, [canRead, includeInactive, isHead, requestForm, user?.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

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
      const sale = await createPharmacySale(assignedSubPharmacy.id, { customerName: values.customerName.trim(), customerPhone: values.customerPhone?.trim() || null, paymentMethod: values.paymentMethod, items: values.items });
      setCompletedSale(sale);
      saleForm.resetFields();
      toast.success("Sale recorded and receipt is ready");
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

  const submitDirectTransfer = async (values: TransferFormValues) => {
    if (!transferMedicine || !centralWarehouse) return;
    setSaving(true);
    try {
      const result = await transferWarehouseStock({
        sourcePharmacyId: centralWarehouse.id,
        destinationPharmacyId: values.destinationPharmacyId,
        medicineId: transferMedicine.id,
        quantity: values.quantity,
        reason: values.reason?.trim() || null,
      });
      transferForm.resetFields();
      setTransferMedicine(null);
      toast.success(`${result.quantity} units sent to ${result.destination.name}`);
      await load();
    } catch (error) { toast.error(getApiErrorMessage(error, "Could not transfer stock")); }
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

  const defaultStockPharmacy = pharmacies.find(({ type, isActive }) => type === "central_store" && isActive);
  const activeSubPharmacies = pharmacies.filter(({ type, isActive }) => type === "sub_store" && isActive);
  const filteredMedicines = useMemo(() => {
    const query = medicineSearch.trim().toLocaleLowerCase();
    if (!query) return medicines;
    return medicines.filter((medicine) =>
      [medicine.name, medicine.genericName, medicine.form, medicine.strength]
        .some((value) => value?.toLocaleLowerCase().includes(query)),
    );
  }, [medicines, medicineSearch]);
  const catalogueColumns: TableProps<ClinicalMedicine>["columns"] = [
    { title: "NAME", dataIndex: "name", render: (name: string, medicine) => <Text strong>{name}{medicine.strength ? ` · ${medicine.strength}` : ""}</Text> },
    { title: "GENERIC NAME", dataIndex: "genericName", render: (value?: string | null) => value || "—" },
    { title: "FORM", dataIndex: "form", render: (value?: string | null) => value || "—" },
    { title: "TOTAL STOCK", key: "stock", render: (_, medicine) => <Tag color={(medicineStock.get(medicine.id) ?? 0) > 0 ? "green" : "red"}>{medicineStock.get(medicine.id) ?? 0} units</Tag> },
    ...(canManageWarehouse ? [{ title: "ACTIVE", dataIndex: "isActive", render: (active: boolean, medicine: ClinicalMedicine) => <Switch checked={active} onChange={(checked) => void toggleMedicine(medicine, checked)} /> }] : []),
    ...(canManageWarehouse ? [{ title: "STOCK", key: "manageStock", render: (_: unknown, medicine: ClinicalMedicine) => <Space><Button type="link" disabled={!defaultStockPharmacy} onClick={() => defaultStockPharmacy && setStockMedicine({ pharmacy: defaultStockPharmacy, stock: defaultStockPharmacy.Stocks.find(({ medicineId }) => medicineId === medicine.id) ?? null, medicine })}>Manage stock</Button><Button type="link" icon={<ArrowRightLeft size={15} />} disabled={!defaultStockPharmacy || activeSubPharmacies.length === 0} onClick={() => { transferForm.resetFields(); setTransferMedicine(medicine); }}>Send to sub-pharmacy</Button></Space> }] : []),
  ];

  const requestColumns: TableProps<StockRequestRecord>["columns"] = [
    { title: "FROM", key: "from", render: (_, request) => request.RequestingPharmacy.name },
    { title: "TO", key: "to", render: (_, request) => request.FulfillingPharmacy.name },
    { title: "ITEMS", key: "items", render: (_, request) => request.Items.map((item) => `${item.Medicine.name} × ${item.approvedQuantity ?? item.requestedQuantity}`).join(", ") },
    { title: "STATUS", dataIndex: "status", render: (status: StockRequestStatus) => <Tag color={statusColor[status]}>{status.toUpperCase()}</Tag> },
    { title: "CREATED", dataIndex: "createdAt", render: (value: string) => dayjs(value).format("MMM D, YYYY h:mm A") },
    { title: "ACTION", key: "action", render: (_, request) => request.status === "pending" && isHead ? <Space><Button size="small" type="primary" onClick={() => void changeRequest(request, "approved")} loading={saving}>Approve</Button><Button size="small" danger onClick={() => void changeRequest(request, "rejected")} loading={saving}>Reject</Button></Space> : request.status === "approved" && isHead ? <Button size="small" onClick={() => void changeRequest(request, "dispatched")} loading={saving}>Dispatch</Button> : request.status === "dispatched" && request.RequestingPharmacy.pharmacistUserId === user?.id ? <Button size="small" type="primary" onClick={() => { receiptForm.resetFields(); setReceiptRequest(request); }} loading={saving}>Count delivery</Button> : null },
  ];

  if (!canRead) {
    return <Alert type="warning" showIcon message="You do not have pharmacy access." description="Ask a hospital administrator to grant medicine catalogue read permission." />;
  }
  if (loading) return <PageSkeleton />;

  const activePharmacies = pharmacies.filter((pharmacy) => pharmacy.isActive);
  const requestPharmacyOptions = (isHead ? activePharmacies : activePharmacies.filter((pharmacy) => pharmacy.id === assignedSubPharmacy?.id))
    .map((pharmacy) => ({ value: pharmacy.id, label: pharmacy.name }));
  const fulfillingPharmacyOptions = activePharmacies.filter((pharmacy) => pharmacy.type === "central_store")
    .map((pharmacy) => ({ value: pharmacy.id, label: pharmacy.name }));

  return (
    <ConfigProvider theme={appTheme}>
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
                <Col xs={24} xl={10}>{!isHead && assignedSubPharmacy ? <Card title={`Request stock for ${assignedSubPharmacy.name}`}><Form form={requestForm} layout="vertical" onFinish={(values) => void submitRequest(values)}><Form.Item name="requestingPharmacyId" label="Requesting pharmacy" rules={[{ required: true }]}><Select options={requestPharmacyOptions} disabled /></Form.Item><Form.Item name="fulfillingPharmacyId" label="Fulfil from" rules={[{ required: true }]}><Select options={fulfillingPharmacyOptions} disabled={!centralWarehouse} /></Form.Item><Form.Item name="medicineId" label="Medicine" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={medicines.filter(({ isActive }) => isActive).map((medicine) => ({ value: medicine.id, label: `${medicine.name}${medicine.strength ? ` · ${medicine.strength}` : ""}` }))} /></Form.Item><Form.Item name="requestedQuantity" label="Quantity" rules={[{ required: true, type: "number", min: 1 }]}><InputNumber min={1} style={{ width: "100%" }} /></Form.Item><Form.Item name="notes" label="Notes"><Input.TextArea maxLength={2000} rows={2} /></Form.Item><Button type="primary" htmlType="submit" loading={saving} disabled={!canWrite || !centralWarehouse}>Submit request</Button></Form></Card> : isHead ? <Card title="Warehouse operations"><Text type="secondary">Approve and dispatch sub-pharmacy requests from the Stock requests tab. The main warehouse does not need a pharmacist assignment.</Text></Card> : <Alert type="info" message="No sub-pharmacy is assigned to your account." description="Ask an administrator or Head Pharmacist to assign your account before requesting or selling stock." />}</Col>
              </Row>,
            },
            {
              key: "locations", label: isHead ? "Locations" : "My pharmacy", children: <Space direction="vertical" style={{ width: "100%" }} size="middle">{isHead && <Card title="Add pharmacy location" extra={<Plus size={18} />}><Form form={pharmacyForm} layout="inline" onFinish={(values) => void addPharmacy(values)}><Form.Item name="name" rules={[{ required: true }]}><Input placeholder="Sub-pharmacy name" /></Form.Item><Form.Item name="type" initialValue="sub_store" rules={[{ required: true }]}><Select style={{ width: 170 }} options={centralWarehouse ? [{ value: "sub_store", label: "Sub store" }] : [{ value: "central_store", label: "Main warehouse" }, { value: "sub_store", label: "Sub store" }]} /></Form.Item><Button type="primary" htmlType="submit" loading={saving} disabled={!canManageWarehouse}>Add location</Button></Form><Text type="secondary">The hospital has one main warehouse. Create sub-pharmacies here and assign each one pharmacist.</Text></Card>}<Row gutter={[16, 16]}>{(isHead ? pharmacies : assignedSubPharmacy ? [assignedSubPharmacy] : []).map((pharmacy) => <Col xs={24} md={12} xl={8} key={pharmacy.id}><Card title={pharmacy.name} extra={isHead && <Switch checked={pharmacy.isActive} onChange={(checked) => void togglePharmacy(pharmacy, checked)} />}><Space direction="vertical" style={{ width: "100%" }}><Tag>{pharmacy.type === "central_store" ? "Main warehouse" : "Sub-pharmacy"}</Tag>{isHead && pharmacy.type === "sub_store" && <Select allowClear value={pharmacy.pharmacistUserId ?? undefined} placeholder="Assign pharmacist" options={staff.filter((member) => member.role.toLowerCase().includes("pharmacist")).map((member) => ({ value: member.userId, label: member.name }))} onChange={(value) => void assignStaff(pharmacy.id, value ?? null)} style={{ width: "100%" }} />}<Text><Package size={14} /> {pharmacy.stockCount} units across {pharmacy.Stocks.length} medicines</Text><Text type={pharmacy.lowStockCount ? "danger" : "secondary"}>{pharmacy.lowStockCount} low stock alerts</Text>{pharmacy.Stocks.slice(0, 5).map((stock) => <Button key={stock.id} type="link" style={{ padding: 0, textAlign: "left" }} disabled={!canManageWarehouse || pharmacy.type !== "central_store"} onClick={() => setStockMedicine({ pharmacy, stock, medicine: stock.Medicine })}>{stock.Medicine.name}: {stock.currentStock} units · Manage warehouse stock</Button>)}</Space></Card></Col>)}</Row>{!isHead && assignedSubPharmacy && <Card title={`My stock · ${assignedSubPharmacy.name}`}><Table rowKey="id" dataSource={assignedStockRows} loading={loading} pagination={{ pageSize: 8 }} locale={{ emptyText: "No stock has been received yet." }} columns={[{ title: "MEDICINE", key: "medicine", render: (_, stock) => `${stock.Medicine.name}${stock.Medicine.strength ? ` · ${stock.Medicine.strength}` : ""}` }, { title: "AVAILABLE", dataIndex: "currentStock" }, { title: "REORDER AT", dataIndex: "reorderLevel" }]} /></Card>}</Space>,
            },
            {
              key: "catalogue", label: "Medicine catalogue", children: <Card title="Medicine catalogue" extra={<Space><Switch checked={includeInactive} onChange={setIncludeInactive} /><Text>Show inactive</Text></Space>}><Input.Search aria-label="Search medicine catalogue" placeholder="Search by medicine, generic name, form, or strength" allowClear value={medicineSearch} onChange={(event) => setMedicineSearch(event.target.value)} style={{ maxWidth: 420, marginBottom: 16 }} />{canManageWarehouse && <Form form={medicineForm} layout="inline" onFinish={(values) => void addMedicine(values)} style={{ marginBottom: 16 }}><Form.Item name="name" rules={[{ required: true }]}><Input placeholder="Medicine name" /></Form.Item><Form.Item name="genericName"><Input placeholder="Generic name" /></Form.Item><Form.Item name="form"><Input placeholder="Form" /></Form.Item><Form.Item name="strength"><Input placeholder="Strength" /></Form.Item><Form.Item name="purchasePrice"><InputNumber min={0} precision={2} placeholder="Purchase price" /></Form.Item><Form.Item name="sellingPrice"><InputNumber min={0} precision={2} placeholder="Selling price" /></Form.Item><Button type="primary" htmlType="submit" loading={saving}>Add medicine</Button></Form>}<Table<ClinicalMedicine> rowKey="id" loading={loading} dataSource={filteredMedicines} columns={catalogueColumns} pagination={{ pageSize: 8 }} locale={{ emptyText: medicineSearch ? "No medicines match your search" : "No medicines in the catalogue" }} /></Card>,
            },
            {
              key: "sales", label: "Sell medicines", children: assignedSubPharmacy ? <Card title={`Sell from ${assignedSubPharmacy.name}`}><Form form={saleForm} layout="vertical" onFinish={(values) => void sellMedicine(values)} initialValues={{ paymentMethod: "cash", items: [{ quantity: 1 }] }}><Row gutter={16}><Col xs={24} md={14}><Form.Item name="customerName" label="Customer name" rules={[{ required: true }]}><Input /></Form.Item></Col><Col xs={24} md={10}><Form.Item name="customerPhone" label="Customer phone"><Input /></Form.Item></Col></Row><Form.List name="items" rules={[{ validator: async (_, items: SaleFormValues["items"]) => { if (!items?.length) throw new Error("Add at least one medicine to the sale."); } }]}>{(fields, { add, remove }, { errors }) => <Space direction="vertical" size="middle" style={{ width: "100%" }}>{fields.map((field) => { const selectedIds = saleItems.filter((_, index) => index !== field.name).map((item) => item?.medicineId).filter(Boolean); const selectedMedicineId = saleItems[field.name]?.medicineId; const availableStock = assignedSubPharmacy.Stocks.find((stock) => stock.medicineId === selectedMedicineId)?.currentStock; return <Card key={field.key} size="small" title={`Medicine ${field.name + 1}`} extra={fields.length > 1 && <Button danger type="text" aria-label="Remove medicine" icon={<Trash2 size={16} />} onClick={() => remove(field.name)} />}><Row gutter={12} align="bottom"><Col xs={24} md={16}><Form.Item name={[field.name, "medicineId"]} label="Medicine" rules={[{ required: true, message: "Select a medicine" }]}><Select showSearch optionFilterProp="label" options={assignedSubPharmacy.Stocks.filter(({ currentStock, medicineId }) => currentStock > 0 && !selectedIds.includes(medicineId)).map((stock) => ({ value: stock.medicineId, label: `${stock.Medicine.name}${stock.Medicine.strength ? ` · ${stock.Medicine.strength}` : ""} · ${stock.currentStock} available · PKR ${Number(stock.Medicine.sellingPrice).toFixed(2)}` }))} onChange={() => saleForm.setFieldValue(["items", field.name, "quantity"], 1)} /></Form.Item></Col><Col xs={24} md={8}><Form.Item name={[field.name, "quantity"]} label="Quantity" rules={[{ required: true, type: "number", min: 1, message: "Enter a quantity of at least 1" }]}><InputNumber min={1} precision={0} max={availableStock} style={{ width: "100%" }} /></Form.Item></Col></Row></Card>; })}<Button type="dashed" icon={<Plus size={15} />} onClick={() => add({ quantity: 1 })} block>Add another medicine</Button><Form.ErrorList errors={errors} /></Space>}</Form.List><Row gutter={16}><Col xs={24} sm={12}><Form.Item name="paymentMethod" label="Payment"><Select options={[{ value: "cash", label: "Cash" }, { value: "card", label: "Card" }, { value: "insurance", label: "Insurance" }]} /></Form.Item></Col><Col xs={24} sm={12} style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", paddingBottom: 24 }}><Button type="primary" htmlType="submit" loading={saving} disabled={!canWrite}>Complete sale</Button></Col></Row></Form></Card> : <Alert type="info" message="No sub-pharmacy is assigned to your account." description="A head pharmacist must assign you to a sub-pharmacy before you can sell medicines." />,
            },
            {
              key: "requests", label: `Stock requests (${requests.length})`, children: <Card><Table<StockRequestRecord> rowKey="id" loading={loading} dataSource={requests} columns={requestColumns} pagination={{ pageSize: 8 }} /></Card>,
            },
          ]} />
        </Space>
        <Modal title={transferMedicine ? `Send to sub-pharmacy · ${transferMedicine.name}` : "Send stock"} open={Boolean(transferMedicine)} onCancel={() => { setTransferMedicine(null); transferForm.resetFields(); }} footer={null} destroyOnClose>
          {transferMedicine && centralWarehouse && <Form form={transferForm} layout="vertical" onFinish={(values) => void submitDirectTransfer(values)}>
            <Alert showIcon type="info" message="This transfer updates stock immediately" description={`The quantity will be deducted from ${centralWarehouse.name} and added to the selected sub-pharmacy as soon as you confirm.`} />
            <Text type="secondary">Available in main warehouse: {centralWarehouse.Stocks.find(({ medicineId }) => medicineId === transferMedicine.id)?.currentStock ?? 0} units</Text>
            <Form.Item name="destinationPharmacyId" label="Sub-pharmacy" rules={[{ required: true, message: "Choose a destination sub-pharmacy" }]}>
              <Select options={activeSubPharmacies.map((pharmacy) => ({ value: pharmacy.id, label: pharmacy.name }))} placeholder="Choose a destination" />
            </Form.Item>
            <Form.Item name="quantity" label="Quantity" rules={[{ required: true, type: "number", min: 1, message: "Enter at least one unit" }]}>
              <InputNumber min={1} max={centralWarehouse.Stocks.find(({ medicineId }) => medicineId === transferMedicine.id)?.currentStock ?? 0} precision={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="reason" label="Transfer note"><Input.TextArea rows={2} maxLength={1000} /></Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} disabled={!canManageWarehouse}>Confirm transfer</Button>
          </Form>}
        </Modal>
        <Modal title={stockMedicine ? `Manage stock · ${stockMedicine.medicine.name}` : "Manage stock"} open={Boolean(stockMedicine)} onCancel={() => setStockMedicine(null)} footer={null} destroyOnClose>
          {stockMedicine && <Form form={stockForm} layout="vertical" onFinish={(values) => void recordStock(values)}><Text type="secondary">{stockMedicine.pharmacy.name} currently has {stockMedicine.stock?.currentStock ?? 0} units.</Text><Form.Item name="type" label="Movement" initialValue="IN" rules={[{ required: true }]}><Select options={[{ value: "IN", label: "Stock received" }, { value: "OUT", label: "Dispensed" }]} /></Form.Item><Form.Item name="quantity" label="Quantity" rules={[{ required: true, type: "number", min: 1 }]}><InputNumber min={1} precision={0} style={{ width: "100%" }} /></Form.Item><Form.Item name="reorderLevel" label="Reorder level"><InputNumber min={0} precision={0} style={{ width: "100%" }} placeholder={String(stockMedicine.stock?.reorderLevel ?? 10)} /></Form.Item><Form.Item name="reason" label="Reason"><Input.TextArea maxLength={1000} rows={2} /></Form.Item><Button type="primary" htmlType="submit" loading={saving} disabled={!canManageWarehouse}>Record movement</Button></Form>}
        </Modal>
        <Modal title={receiptRequest ? `Count delivery · ${receiptRequest.RequestingPharmacy.name}` : "Count delivery"} open={Boolean(receiptRequest)} onCancel={() => setReceiptRequest(null)} footer={null} destroyOnClose>
          {receiptRequest && <Form form={receiptForm} layout="vertical"><Text type="secondary">Enter the physical quantity received for each medicine.</Text>{receiptRequest.Items.map((item) => <Form.Item key={item.id} name={`received_${item.id}`} label={`${item.Medicine.name} (approved: ${item.approvedQuantity ?? item.requestedQuantity})`} initialValue={item.approvedQuantity ?? item.requestedQuantity} rules={[{ required: true, type: "number", min: 0 }]}><InputNumber min={0} precision={0} style={{ width: "100%" }} /></Form.Item>)}<Form.Item name="receiptNote" label="Receipt note"><Input.TextArea rows={2} maxLength={2000} placeholder="Explain shortages or non-receipt" /></Form.Item><Space><Button onClick={() => void receiptForm.validateFields().then((values) => submitReceipt(values, "not_received"))} danger loading={saving}>Not received</Button><Button onClick={() => void receiptForm.validateFields().then((values) => submitReceipt(values, "partially_received"))} loading={saving}>Partially received</Button><Button type="primary" onClick={() => void receiptForm.validateFields().then((values) => submitReceipt(values, "received"))} loading={saving}>Received in full</Button></Space></Form>}
        </Modal>
        <Modal title="Sale receipt" open={Boolean(completedSale)} onCancel={() => setCompletedSale(null)} footer={completedSale && <Space><Button onClick={() => setCompletedSale(null)}>Close</Button><Button type="primary" icon={<Printer size={15} />} onClick={() => window.print()}>Print receipt</Button></Space>} width={600} destroyOnClose>
          {completedSale && <div id="pharmacy-sale-receipt" className="pharmacy-sale-receipt">
            <div className="pharmacy-sale-receipt__header"><div><Title level={4}>CareBase Pharmacy</Title><Text type="secondary">{completedSale.Pharmacy.name}</Text></div><Tag color="green">PAID</Tag></div>
            <div className="pharmacy-sale-receipt__meta"><span><Text type="secondary">Receipt</Text><Text strong>{completedSale.id.slice(0, 8).toUpperCase()}</Text></span><span><Text type="secondary">Date</Text><Text strong>{dayjs(completedSale.createdAt).format("MMM D, YYYY h:mm A")}</Text></span><span><Text type="secondary">Customer</Text><Text strong>{completedSale.customerName}</Text></span>{completedSale.customerPhone && <span><Text type="secondary">Phone</Text><Text strong>{completedSale.customerPhone}</Text></span>}</div>
            <table className="pharmacy-sale-receipt__table"><thead><tr><th>Medicine</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>{completedSale.Items.map((item) => <tr key={item.id}><td>{item.Medicine.name}{item.Medicine.strength ? ` · ${item.Medicine.strength}` : ""}</td><td>{item.quantity}</td><td>PKR {Number(item.unitSellingPrice).toFixed(2)}</td><td>PKR {Number(item.lineTotal).toFixed(2)}</td></tr>)}</tbody></table>
            <div className="pharmacy-sale-receipt__total"><Text>Payment · {completedSale.paymentMethod.toUpperCase()}</Text><Title level={4}>PKR {Number(completedSale.totalAmount).toFixed(2)}</Title></div>
            <Text className="pharmacy-sale-receipt__thanks">Thank you. Please keep this receipt for your records.</Text>
          </div>}
        </Modal>
      </div>
    </ConfigProvider>
  );
}
