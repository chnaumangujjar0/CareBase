import React, { useState, useEffect } from "react";
import {
  ConfigProvider,
  Card,
  Table,
  Button,
  Input,
  Typography,
  Flex,
  Tag,
  Space,
  Modal,
  Form,
  Select,
  message,
  Popconfirm,
  Tooltip,
  Badge
} from "antd";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  BedSingle,
  DoorOpen,
  User,
  CheckCircle2,
  Wrench,
  Sparkles
} from "lucide-react";
import {
  createBed,
  deleteBed,
  getAllRooms,
  getApiErrorMessage,
  getBeds,
  updateBed,
} from "../../services/api";
import type { BedStatus } from "../../types/global.types";
import { toast } from "react-toastify";

const { Title, Text } = Typography;

// --- Types based on your backend ---
interface Bed {
  id: string;
  code: string;
  status: BedStatus;
  roomId: string;
  Room?: {
    id: string;
    name: string;
    wardId?: string;
  };
  currentPatientId: string | null;
  version: number; // For optimistic concurrency control
  tenantId: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// --- Enhanced Theme Configuration (Matches previous components) ---
const themeConfig = {
  token: {
    colorPrimary: '#0F766E', // Deep Teal
    colorSuccess: '#10B981', // Modern Green
    colorInfo: '#0EA5E9',    // Modern Blue
    colorWarning: '#F59E0B', // Amber for Maintenance
    colorError: '#EF4444',
    colorTextBase: '#334155',
    colorBgLayout: '#F8FAFC',
    colorBorder: '#E2E8F0',
    borderRadius: 12,
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    boxShadowTertiary: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    controlHeightLG: 48,
  },
  components: {
    Card: {
      borderRadiusLG: 16,
    },
    Table: {
      headerBg: '#F1F5F9',
      headerColor: '#475569',
      rowHoverBg: '#F8FAFC',
      borderRadiusLG: 12,
    }
  }
};

export const Bed: React.FC = () => {
  const [form] = Form.useForm();
  
  // State
  const [beds, setBeds] = useState<Bed[]>([]);
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]); // For the dropdown
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBed, setEditingBed] = useState<Bed | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchRooms = async () => {
    try {
      const response = await getAllRooms();
      setRooms(response.map(({ id, name, Ward }) => ({
        id,
        name: Ward ? `${Ward.name} - ${name}` : name,
      })));
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Failed to fetch rooms"));
    }
  };

  const fetchBeds = async (page = 1, search = "") => {
    setLoading(true);
    try {
      const response = await getBeds({ page, limit: 10, search: search || undefined });
      setBeds(response.items);
      setPagination(response.pagination);
    } catch (error: unknown) {
      message.error(getApiErrorMessage(error, "Failed to fetch beds"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchRooms();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchBeds(1, searchQuery);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  // --- Handlers ---
  const handleOpenModal = (bed?: Bed) => {
    if (bed) {
      setEditingBed(bed);
      form.setFieldsValue({
        code: bed.code,
        roomId: bed.roomId,
        status: bed.status,
      });
    } else {
      setEditingBed(null);
      form.resetFields();
      form.setFieldsValue({ status: "available" }); // Default for create
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    form.resetFields();
    setEditingBed(null);
  };

  const handleSubmit = async (values: { code: string; roomId: string; status: BedStatus }) => {
    setSubmitLoading(true);
    try {
      if (editingBed) {
        await updateBed(editingBed.id, {
          version: editingBed.version,
          code: values.code,
          ...(!editingBed.currentPatientId ? {
            roomId: values.roomId,
            ...(values.status !== "occupied" ? { status: values.status } : {}),
          } : {}),
        });
        toast.success("Bed updated successfully.");
      } else {
        await createBed({
          code: values.code,
          roomId: values.roomId,
          status: values.status === "occupied" ? "available" : values.status,
        });
        toast.success("Bed created successfully.");
      }
      await fetchBeds(pagination.page, searchQuery);
      handleCloseModal();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Could not save bed"));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (bed: Bed) => {
    // Matches backend: if (bed.currentPatientId) throw ApiError(409)
    if (bed.currentPatientId) {
      toast.warning("This bed is currently occupied. Discharge or transfer the patient before deleting it.");
      return;
    }
    
    try {
      await deleteBed(bed.id);
      toast.success("Bed deleted successfully.");
      await fetchBeds(pagination.page, searchQuery);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to delete bed"));
    }
  };

  // --- UI Helpers ---
  const getStatusDisplay = (status: BedStatus) => {
    switch(status) {
      case "available": return { color: "success", icon: <CheckCircle2 size={12} />, text: "Available" };
      case "maintenance": return { color: "warning", icon: <Wrench size={12} />, text: "Maintenance" };
      case "cleaning": return { color: "processing", icon: <Sparkles size={12} />, text: "Cleaning" };
      case "reserved": return { color: "purple", icon: null, text: "Reserved" };
      case "occupied": return { color: "blue", icon: <User size={12} />, text: "Occupied" };
      default: return { color: "default", icon: null, text: "Out of Service" };
    }
  };

  // --- Table Columns ---
  const columns = [
    {
      title: 'Bed Code',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => (
        <Flex align="center" gap={12}>
          <div style={{ padding: 8, background: '#E0F2FE', borderRadius: 8, color: themeConfig.token.colorInfo }}>
            <BedSingle size={18} />
          </div>
          <Text strong style={{ fontSize: 14 }}>{text}</Text>
        </Flex>
      ),
    },
    {
      title: 'Assigned Room',
      key: 'room',
      render: (_: unknown, record: Bed) => (
        record.Room ? (
          <Tag icon={<DoorOpen size={12} style={{ marginRight: 4 }}/>} color="blue" style={{ borderRadius: 12, padding: '2px 10px' }}>
            {record.Room.name}
          </Tag>
        ) : (
          <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 13 }}>Unassigned</Text>
        )
      ),
    },
    {
      title: 'Occupancy',
      key: 'occupancy',
      render: (_: unknown, record: Bed) => (
        record.currentPatientId ? (
          <Badge status="processing" text={<Text strong style={{ color: themeConfig.token.colorInfo }}>Occupied</Text>} />
        ) : (
          <Badge status="default" text={<Text type="secondary">Empty</Text>} />
        )
      ),
    },
    {
      title: 'Physical Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: BedStatus) => {
        const display = getStatusDisplay(status);
        return (
          <Tag color={display.color} icon={<span style={{ marginRight: 4 }}>{display.icon}</span>} style={{ borderRadius: 12, padding: '2px 10px', fontWeight: 500 }}>
            {display.text}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: Bed) => (
        <Space size="middle">
          <Tooltip title="Edit Bed">
            <Button 
              type="text" 
              icon={<Edit2 size={16} color={themeConfig.token.colorPrimary} />} 
              onClick={() => handleOpenModal(record)}
            />
          </Tooltip>
          <Tooltip title={record.currentPatientId ? "Cannot delete occupied bed" : "Delete Bed"}>
            <Popconfirm
              title="Delete Bed"
              description="Are you sure you want to delete this bed?"
              onConfirm={() => handleDelete(record)}
              okText="Yes, Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
              disabled={!!record.currentPatientId}
            >
              <Button 
                type="text" 
                danger 
                icon={<Trash2 size={16} />} 
                disabled={!!record.currentPatientId}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider theme={themeConfig}>
      <div style={{ padding: '32px 40px', minHeight: '100vh', backgroundColor: themeConfig.token.colorBgLayout }}>
        
        {/* Page Header */}
        <Flex justify="space-between" align="center" style={{ marginBottom: 32 }}>
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1E293B' }}>
              Bed Management
            </Title>
            <Text type="secondary" style={{ fontSize: 15, marginTop: 4, display: 'block' }}>
              Track hospital beds, their physical status, and room assignments.
            </Text>
          </div>
          <Button 
            type="primary" 
            size="large" 
            icon={<Plus size={18} />} 
            onClick={() => handleOpenModal()}
            style={{ fontWeight: 600, borderRadius: 8 }}
          >
            Add New Bed
          </Button>
        </Flex>

        {/* Data Card */}
        <Card bordered={false} style={{ boxShadow: themeConfig.token.boxShadowTertiary, padding: '8px 0' }}>
          
          {/* Toolbar */}
          <Flex justify="space-between" align="center" style={{ marginBottom: 24, padding: '0 24px' }}>
            <Input
              placeholder="Search beds by code..."
              prefix={<Search size={16} color="#94A3B8" />}
              size="large"
              style={{ width: 320, borderRadius: 8 }}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Flex>

          {/* Table */}
          <Table 
            columns={columns} 
            dataSource={beds} 
            rowKey="id"
            loading={loading}
            pagination={{
              current: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total,
              onChange: (page) => void fetchBeds(page, searchQuery),
              showSizeChanger: false,
            }}
          />
        </Card>

        {/* Create / Edit Modal */}
        <Modal
          title={
            <Text style={{ fontSize: 18, fontWeight: 700, color: themeConfig.token.colorPrimary }}>
              {editingBed ? "Edit Bed Details" : "Create New Bed"}
            </Text>
          }
          open={isModalOpen}
          onCancel={handleCloseModal}
          footer={null}
          zIndex={1100}
        >
          {editingBed?.currentPatientId && (
            <div style={{ padding: '12px 16px', background: '#EFF6FF', borderLeft: `4px solid ${themeConfig.token.colorInfo}`, borderRadius: 8, marginBottom: 24 }}>
              <Flex align="center" gap={8}>
                <User size={18} color={themeConfig.token.colorInfo} />
                <Text style={{ color: '#1E3A8A', fontSize: 13, fontWeight: 500 }}>
                  This bed is currently occupied. Room and status cannot be changed until the patient is discharged or transferred.
                </Text>
              </Flex>
            </div>
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            style={{ marginTop: 12 }}
            requiredMark="optional"
          >
            <Form.Item 
              name="code" 
              label={<Text strong style={{ color: '#475569' }}>Bed Code / Identifier <span style={{ color: themeConfig.token.colorError }}>*</span></Text>}
              rules={[
                { required: true, message: "Bed code is required" },
                { max: 30, message: "Code cannot exceed 30 characters" }
              ]}
            >
              <Input size="large" placeholder="e.g. 101-A, ICU-Bed-3" />
            </Form.Item>

            <Form.Item 
              name="roomId" 
              label={<Text strong style={{ color: '#475569' }}>Assigned Room <span style={{ color: themeConfig.token.colorError }}>*</span></Text>}
              rules={[{ required: true, message: "Please assign this bed to a room" }]}
            >
              <Select 
                size="large" 
                placeholder="Select a room"
                options={rooms.map(r => ({ value: r.id, label: r.name }))}
                showSearch
                optionFilterProp="label"
                disabled={!!editingBed?.currentPatientId} // Blocked if occupied (matching backend rules)
              />
            </Form.Item>

            <Form.Item 
              name="status" 
              label={<Text strong style={{ color: '#475569' }}>Physical Status</Text>}
            >
              <Select 
                size="large" 
                disabled={!!editingBed?.currentPatientId} // Blocked if occupied
                options={[
                  { value: 'available', label: 'Available' },
                  { value: 'maintenance', label: 'Maintenance' },
                  { value: 'cleaning', label: 'Cleaning' },
                  { value: 'reserved', label: 'Reserved' },
                  ...(editingBed?.status === "occupied"
                    ? [{ value: "occupied", label: "Occupied" }]
                    : []),
                ]}
              />
            </Form.Item>

            <Flex justify="flex-end" gap={12} style={{ marginTop: 32 }}>
              <Button size="large" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="primary" size="large" htmlType="submit" loading={submitLoading} style={{ fontWeight: 600 }}>
                {editingBed ? "Save Changes" : "Create Bed"}
              </Button>
            </Flex>
          </Form>
        </Modal>

      </div>
    </ConfigProvider>
  );
};