import { useCallback, useEffect, useState } from "react";
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
  Spin,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowLeft, 
  AlertTriangle, 
  Store, 
  Activity, 
  Package, 
  Pill 
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  BarChart, 
  Bar 
} from "recharts";
import { toast } from "react-toastify";
import dayjs from "dayjs";

import { selectCurrentUser } from "../../store/authSlice";
import type { AuthUser } from "../../types/auth";
import type { ClinicalMedicine, ClinicalStockTransaction } from "../../types/global.types";
import {
  createClinicalMedicine,
  createClinicalMedicineStockTransaction,
  getApiErrorMessage,
  getClinicalMedicines,
  getClinicalMedicineStockTransactions,
  setClinicalMedicineActive,
} from "../../services/api";

const { Title, Text } = Typography;

// --- DUMMY DATA FOR DASHBOARDS ---
const DUMMY_PHARMACIES = [
  { id: "1", name: "Main Warehouse", type: "central_store", isActive: true, trend: "up", trendValue: 8.5, monthlySales: 450000, todaySales: 12000 },
  { id: "2", name: "ER Pharmacy", type: "sub_store", isActive: true, trend: "up", trendValue: 12.2, monthlySales: 125000, todaySales: 8500 },
  { id: "3", name: "ICU Pharmacy", type: "sub_store", isActive: true, trend: "down", trendValue: 3.1, monthlySales: 85000, todaySales: 2100 },
  { id: "4", name: "Maternity Ward Cabinet", type: "sub_store", isActive: false, trend: "up", trendValue: 0, monthlySales: 0, todaySales: 0 },
];

const DUMMY_ALERTS = [
  { id: "1", medicineName: "Panadol 500mg", pharmacyId: "2", pharmacyName: "ER Pharmacy", currentStock: 12, reorderLevel: 50 },
  { id: "2", medicineName: "Amoxicillin 250mg", pharmacyId: "1", pharmacyName: "Main Warehouse", currentStock: 45, reorderLevel: 500 },
  { id: "3", medicineName: "Ibuprofen 400mg", pharmacyId: "3", pharmacyName: "ICU Pharmacy", currentStock: 5, reorderLevel: 20 },
  { id: "4", medicineName: "Morphine 10mg", pharmacyId: "2", pharmacyName: "ER Pharmacy", currentStock: 2, reorderLevel: 10 },
];

// Recharts Dummy Data
const DUMMY_GLOBAL_SALES = [
  { name: 'May', sales: 320000 },
  { name: 'Jun', sales: 380000 },
  { name: 'Jul', sales: 410000 },
  { name: 'Aug', sales: 390000 },
  { name: 'Sep', sales: 520000 },
  { name: 'Oct', sales: 660000 },
];

const DUMMY_LOCAL_SALES = [
  { name: 'Mon', sales: 4200 },
  { name: 'Tue', sales: 5100 },
  { name: 'Wed', sales: 3800 },
  { name: 'Thu', sales: 6200 },
  { name: 'Fri', sales: 8500 },
  { name: 'Sat', sales: 12000 },
  { name: 'Sun', sales: 8500 },
];

interface MedicineFormValues {
  name: string;
  genericName?: string;
  form?: string;
  strength?: string;
}

interface StockTransactionFormValues {
  type: "IN" | "OUT";
  quantity: number;
  reason?: string;
}

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

export default function Pharmacy() {
  const user = useSelector(selectCurrentUser) as AuthUser | null;
  const [medicines, setMedicines] = useState<ClinicalMedicine[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [medicineForm] = Form.useForm<MedicineFormValues>();
  const [stockForm] = Form.useForm<StockTransactionFormValues>();
  const [selectedMedicine, setSelectedMedicine] = useState<ClinicalMedicine | null>(null);
  const [stockBalance, setStockBalance] = useState(0);
  const [stockTransactions, setStockTransactions] = useState<ClinicalStockTransaction[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);

  // --- ROLE BASED LOGIC ---
  const userRole = user?.role?.toLowerCase() || "head_pharmacist"; 
  const isSuperRole = ["admin", "owner", "head_pharmacist", "superadmin"].includes(userRole);
  
  // If not a super role, mock their assigned pharmacy (e.g., ER Pharmacy)
  const myAssignedPharmacyId = "2"; 
  
  const [viewingPharmacyId, setViewingPharmacyId] = useState<string | null>(null);
  const [pharmaciesData, setPharmaciesData] = useState(DUMMY_PHARMACIES);

  // --- PERMISSIONS ---
  const hasPermission = useCallback((permission: string) =>
    Boolean(user?.permissions?.includes("*") || user?.permissions?.includes(permission)), [user?.permissions]);
  const canReadMedicines = hasPermission("clinical:medicines:read");
  const canManageMedicine = isSuperRole && hasPermission("clinical:medicines:write");
  const canRecordStock = hasPermission("clinical:medicines:write");

  // --- API CALLS ---
  const load = useCallback(async () => {
    if (!canReadMedicines) return;
    setLoading(true);
    try {
      setMedicines(await getClinicalMedicines(undefined, includeInactive));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load medicines"));
    } finally {
      setLoading(false);
    }
  }, [canReadMedicines, includeInactive]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const addMedicine = async (values: MedicineFormValues) => {
    setSaving(true);
    try {
      await createClinicalMedicine({
        name: values.name.trim(),
        genericName: values.genericName?.trim() || null,
        form: values.form?.trim() || null,
        strength: values.strength?.trim() || null,
      });
      toast.success("Medicine added to the catalogue");
      medicineForm.resetFields();
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not add medicine"));
    } finally {
      setSaving(false);
    }
  };

  const toggleMedicine = async (medicine: ClinicalMedicine, isActive: boolean) => {
    try {
      await setClinicalMedicineActive(medicine.id, isActive);
      toast.success(isActive ? "Medicine reactivated" : "Medicine deactivated");
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not update medicine"));
    }
  };

  const openStockHistory = async (medicine: ClinicalMedicine) => {
    setSelectedMedicine(medicine);
    stockForm.resetFields();
    setLoadingStock(true);
    try {
      const result = await getClinicalMedicineStockTransactions(medicine.id);
      setStockBalance(result.balance);
      setStockTransactions(result.transactions);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load medicine stock history"));
    } finally {
      setLoadingStock(false);
    }
  };

  const recordStockTransaction = async (values: StockTransactionFormValues) => {
    if (!selectedMedicine) return;
    setSaving(true);
    try {
      const result = await createClinicalMedicineStockTransaction(selectedMedicine.id, {
        type: values.type,
        quantity: values.quantity,
        reason: values.reason?.trim() || null,
      });
      setStockBalance(result.balance);
      stockForm.resetFields();
      toast.success(values.type === "IN" ? "Stock received" : "Stock dispensed");
      await Promise.all([load(), openStockHistory(selectedMedicine)]);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not record stock transaction"));
    } finally {
      setSaving(false);
    }
  };

  // --- CATALOGUE TABLE COLUMNS ---
  const catalogueColumns: TableProps<ClinicalMedicine>["columns"] = [
    { title: "NAME", dataIndex: "name", render: (name: string, medicine) => <Text strong>{name}{medicine.strength ? ` · ${medicine.strength}` : ""}</Text> },
    { title: "GENERIC NAME", dataIndex: "genericName", render: (value?: string | null) => value || "—" },
    { title: "FORM", dataIndex: "form", render: (value?: string | null) => value || "—" },
    {
      title: "STOCK",
      dataIndex: "stockCount",
      render: (count: number) => (
        <Tag color={count > 0 ? "green" : "red"} icon={count > 0 ? <Package size={12} /> : <AlertTriangle size={12} />}>
          {count > 0 ? ` ${count} in stock` : " Out of stock"}
        </Tag>
      ),
    },
    ...(canRecordStock && isSuperRole ? [{ 
      title: "STOCK HISTORY",
      key: "stockHistory",
      render: (_: unknown, medicine: ClinicalMedicine) => (
        <Button type="link" onClick={() => void openStockHistory(medicine)}>Manage stock</Button>
      ),
    }] : []),
    ...(canManageMedicine ? [{
      title: "ACTIVE",
      dataIndex: "isActive",
      render: (isActive: boolean, medicine: ClinicalMedicine) => (
        <Switch checked={isActive} onChange={(checked) => void toggleMedicine(medicine, checked)} />
      ),
    }] : []),
  ];

  // --- NEW UI COMPONENTS ---
  const togglePharmacyStatus = (id: string, checked: boolean) => {
    setPharmaciesData(prev => prev.map(p => p.id === id ? { ...p, isActive: checked } : p));
    toast.success(`Pharmacy ${checked ? 'activated' : 'deactivated'}`);
  };

  // 1. SPECIFIC PHARMACY DASHBOARD (Used by both roles)
  const renderSpecificDashboard = (pharmId: string) => {
    const pharmacy = pharmaciesData.find(p => p.id === pharmId);
    if (!pharmacy) return <Alert type="error" message="Pharmacy not found" />;

    const localAlerts = DUMMY_ALERTS.filter(a => a.pharmacyId === pharmId);

    return (
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {isSuperRole && (
          <Button icon={<ArrowLeft size={16} />} onClick={() => setViewingPharmacyId(null)}>
            Back to Pharmacies
          </Button>
        )}
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={4} style={{ margin: 0 }}>{pharmacy.name} Dashboard</Title>
            <Tag color={pharmacy.type === "central_store" ? "purple" : "blue"} style={{ marginTop: 8 }}>
              {pharmacy.type === "central_store" ? "Main Warehouse" : "Sub Pharmacy"}
            </Tag>
          </Col>
          {!isSuperRole && (
            <Col>
              <Space>
                <Button type="default" icon={<Package size={16} />}>Request Stock</Button>
                <Button type="primary" icon={<Pill size={16} />}>Dispense Medicine</Button>
              </Space>
            </Col>
          )}
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Card>
              <Statistic title="Today's Sales" value={pharmacy.todaySales} prefix="$" precision={2} />
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card>
              <Statistic 
                title="Monthly Sales" 
                value={pharmacy.monthlySales} 
                prefix="$" 
                precision={2}
                valueStyle={{ color: pharmacy.trend === 'up' ? '#3f8600' : '#cf1322' }}
                suffix={
                  <span style={{ fontSize: 14, marginLeft: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {pharmacy.trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />} {pharmacy.trendValue}%
                  </span>
                }
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={16}>
            <Card title="Weekly Sales Volume">
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DUMMY_LOCAL_SALES} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} tick={{ fill: '#64748B' }} />
                    <RechartsTooltip 
                      formatter={(value) => [`$${value}`, "Sales"]} 
                      cursor={{ fill: '#F1F5F9' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="sales" fill="#0F766E" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
          <Col xs={24} xl={8}>
            <Card title={<><AlertTriangle size={18} style={{ color: '#DC2626', marginRight: 8, verticalAlign: 'middle' }}/> Low Stock Alerts</>} variant="outlined" style={{ height: '100%' }}>
              <Table 
                dataSource={localAlerts} 
                rowKey="id" 
                pagination={false}
                size="small"
                locale={{ emptyText: "Stock levels are healthy" }}
                columns={[
                  { title: "Medicine", dataIndex: "medicineName", key: "medicineName" },
                  { title: "Stock", dataIndex: "currentStock", key: "currentStock", render: (val) => <Text type="danger" strong>{val}</Text> },
                  { 
                    title: "Action", 
                    key: "action", 
                    align: "right",
                    render: () => !isSuperRole ? <Button size="small" type="primary" ghost>Request</Button> : <Text type="secondary">View only</Text> 
                  }
                ]}
              />
            </Card>
          </Col>
        </Row>
      </Space>
    );
  };

  // --- TABS DEFINITION FOR SUPER ROLE ---
  const superRoleTabs = [
    {
      key: "1",
      label: "Global Overview",
      children: (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic title="Total Pharmacies" value={pharmaciesData.length} prefix={<Store size={20} style={{ marginRight: 8, color: '#0F766E' }} />} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic title="Global Monthly Sales" value={pharmaciesData.reduce((sum, p) => sum + p.monthlySales, 0)} prefix={<Activity size={20} style={{ marginRight: 8, color: '#0F766E' }}/>} precision={2} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic title="Critical Stock Alerts" value={DUMMY_ALERTS.length} valueStyle={{ color: '#DC2626' }} prefix={<AlertTriangle size={20} style={{ marginRight: 8 }} />} />
              </Card>
            </Col>
          </Row>
          
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={16}>
              <Card title="Global Revenue Trend (6 Months)">
                <div style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={DUMMY_GLOBAL_SALES} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorGlobalSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0F766E" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#0F766E" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value/1000}k`} tick={{ fill: '#64748B' }} />
                      <RechartsTooltip 
                        formatter={(value) => [`$${value}`, "Revenue"]} 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area type="monotone" dataKey="sales" stroke="#0F766E" strokeWidth={3} fillOpacity={1} fill="url(#colorGlobalSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
            <Col xs={24} xl={8}>
              <Card title="Global Stock Alerts" style={{ height: '100%' }}>
                <Table 
                  dataSource={DUMMY_ALERTS} 
                  rowKey="id" 
                  size="small"
                  pagination={{ pageSize: 5 }}
                  columns={[
                    { title: "Location", dataIndex: "pharmacyName", render: (name) => <Tag>{name}</Tag> },
                    { title: "Medicine", dataIndex: "medicineName" },
                    { title: "Stock", dataIndex: "currentStock", render: (val) => <Text type="danger" strong>{val}</Text> },
                    { title: "Action", key: "action", align: "right", render: () => <Button size="small">Transfer</Button> }
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </Space>
      ),
    },
    {
      key: "2",
      label: "Pharmacies & Locations",
      children: (
        <Row gutter={[16, 16]}>
          {pharmaciesData.map(pharmacy => (
            <Col xs={24} sm={12} lg={8} key={pharmacy.id}>
              <Card
                hoverable
                onClick={() => setViewingPharmacyId(pharmacy.id)}
                title={pharmacy.name}
                extra={
                  <Switch 
                    checked={pharmacy.isActive} 
                    onClick={(checked, e) => {
                      e.stopPropagation(); 
                      togglePharmacyStatus(pharmacy.id, checked);
                    }} 
                  />
                }
              >
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Tag color={pharmacy.type === 'central_store' ? 'purple' : 'blue'}>
                    {pharmacy.type === 'central_store' ? 'Main Warehouse' : 'Sub Store'}
                  </Tag>
                  <Statistic
                    title="Monthly Trend"
                    value={Math.abs(pharmacy.trendValue)}
                    precision={1}
                    valueStyle={{ color: pharmacy.trend === 'up' ? '#3f8600' : '#cf1322', fontSize: 18 }}
                    prefix={pharmacy.trend === 'up' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    suffix="%"
                  />
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      ),
    },
    {
      key: "3",
      label: "Medicine Catalogue",
      children: (
        <>
          <Space style={{ width: "100%", justifyContent: "flex-end", marginBottom: 16 }}>
            <Button onClick={() => void load()} loading={loading} disabled={!canReadMedicines}>Refresh Catalogue</Button>
          </Space>
          {!canReadMedicines ? (
            <Alert type="warning" showIcon message="You do not have pharmacy access." description="Ask a hospital administrator to grant medicine catalogue read permission." />
          ) : (
            <Card title="Medicine catalogue">
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                {canManageMedicine && (
                  <>
                    <Form form={medicineForm} layout="vertical" onFinish={(values) => void addMedicine(values)}>
                      <Space align="start" wrap>
                        <Form.Item name="name" label="Medicine name" rules={[{ required: true }]}><Input maxLength={200} /></Form.Item>
                        <Form.Item name="genericName" label="Generic name"><Input maxLength={200} /></Form.Item>
                        <Form.Item name="form" label="Form"><Input placeholder="Tablet, syrup, injection" maxLength={80} /></Form.Item>
                        <Form.Item name="strength" label="Strength"><Input placeholder="500 mg" maxLength={80} /></Form.Item>
                        <Form.Item label=" "><Button type="primary" htmlType="submit" loading={saving}>Add medicine</Button></Form.Item>
                      </Space>
                    </Form>
                    <Space align="center">
                      <Switch checked={includeInactive} onChange={setIncludeInactive} />
                      <Text>Show inactive medicines</Text>
                    </Space>
                  </>
                )}
                <Table<ClinicalMedicine>
                  rowKey="id"
                  columns={catalogueColumns}
                  dataSource={medicines}
                  loading={loading}
                  pagination={{ pageSize: 8 }}
                  locale={{ emptyText: "No medicines found" }}
                />
              </Space>
            </Card>
          )}
        </>
      ),
    },
    {
      key: "4",
      label: "Stock Requests (Warehouse)",
      children: (
        <Card title="Incoming Stock Requests">
          <Text type="secondary">Review and approve stock transfer requests from sub-pharmacies here. (Coming soon)</Text>
        </Card>
      ),
    },
  ];

  return (
    <ConfigProvider theme={themeConfig}>
      <div style={{ padding: 24, background: "#f8fafc", minHeight: "100%" }}>
        <div style={{ marginBottom: 20 }}>
          <Title level={3} style={{ margin: 0 }}>
            {isSuperRole ? "Hospital Pharmacy Administration" : "My Pharmacy"}
          </Title>
          <Text type="secondary">
            {isSuperRole 
              ? "Manage hospital pharmacies, the master catalogue, and global inventory." 
              : "Manage your local stock, record sales, and request inventory."}
          </Text>
        </div>

        {/* IF SUB-PHARMACIST: Force them into their specific dashboard only */}
        {!isSuperRole && renderSpecificDashboard(myAssignedPharmacyId)}

        {/* IF SUPER ROLE: Show Tabs, UNLESS they clicked a specific pharmacy card */}
        {isSuperRole && (
          viewingPharmacyId 
            ? renderSpecificDashboard(viewingPharmacyId) 
            : <Tabs defaultActiveKey="1" items={superRoleTabs} />
        )}

        {/* EXISTING STOCK MODAL (Preserved for Catalogue Tab) */}
        <Modal
          title={selectedMedicine ? `Stock — ${selectedMedicine.name}` : "Medicine stock"}
          open={Boolean(selectedMedicine)}
          onCancel={() => setSelectedMedicine(null)}
          footer={null}
          width={760}
          destroyOnClose
        >
          {selectedMedicine && (
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Title level={5} style={{ margin: 0 }}>
                Current stock: {loadingStock ? <Spin size="small" /> : stockBalance}
              </Title>
              {canRecordStock && (
                <Form form={stockForm} layout="inline" onFinish={(values) => void recordStockTransaction(values)}>
                  <Form.Item name="type" rules={[{ required: true }]} initialValue="IN">
                    <Select
                      style={{ width: 150 }}
                      options={[
                        { value: "IN", label: "Stock received (IN)" },
                        { value: "OUT", label: "Dispensed (OUT)" },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="quantity" rules={[{ required: true }]}><InputNumber min={1} precision={0} placeholder="Quantity" /></Form.Item>
                  <Form.Item name="reason"><Input placeholder="Reason (optional)" maxLength={1000} /></Form.Item>
                  <Form.Item><Button type="primary" htmlType="submit" loading={saving}>Record</Button></Form.Item>
                </Form>
              )}
              <Table<ClinicalStockTransaction>
                rowKey="id"
                loading={loadingStock}
                dataSource={stockTransactions}
                pagination={{ pageSize: 8 }}
                locale={{ emptyText: "No stock transactions recorded" }}
                columns={[
                  { title: "DATE", dataIndex: "createdAt", render: (value: string) => dayjs(value).format("MMM D, YYYY h:mm A") },
                  { title: "TYPE", dataIndex: "type", render: (type: ClinicalStockTransaction["type"]) => <Tag color={type === "IN" ? "green" : "orange"}>{type}</Tag> },
                  { title: "QUANTITY", dataIndex: "quantity" },
                  { title: "REASON", dataIndex: "reason", render: (value?: string | null) => value || "—" },
                  { title: "RECORDED BY", dataIndex: ["User", "name"], render: (value?: string | null) => value || "—" },
                ]}
              />
            </Space>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
}