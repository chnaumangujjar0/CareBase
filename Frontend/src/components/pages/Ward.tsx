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
  Popconfirm,
  Tooltip
} from "antd";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  LayoutDashboard,
  Building2
} from "lucide-react";
import {
  createWard,
  deleteWard,
  getApiErrorMessage,
  getDepartments,
  getWards,
  updateWard,
} from "../../services/api";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../../store/authSlice";
import type { Department } from "../../types/global.types";
import { toast } from "react-toastify";

const { Title, Text } = Typography;

// --- Types based on your backend ---
interface Ward {
  id: string;
  name: string;
  departmentId: string | null;
  tenantId: string;
  Department?: { id: string; name: string } | null;
  _count?: {
    Room: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// --- Enhanced Theme Configuration (Matches HospitalProfile) ---
const themeConfig = {
  token: {
    colorPrimary: '#0F766E', // Deep Teal
    colorSuccess: '#10B981', // Modern Green
    colorInfo: '#0EA5E9',    // Modern Blue
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

export const Wards: React.FC = () => {
  const [form] = Form.useForm();
  
  // State
  const [wards, setWards] = useState<Ward[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWard, setEditingWard] = useState<Ward | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const user = useSelector(selectCurrentUser);

  const fetchWards = async (page = 1, search = "") => {
    setLoading(true);
    try {
      const response = await getWards({ page, limit: 10, search: search || undefined });
      setWards(response.items);
      setPagination(response.pagination);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to fetch wards"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchWards(1, searchQuery);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!user?.tenantId) return;
    getDepartments(user.tenantId)
      .then((items: Department[]) => setDepartments(items))
      .catch((error: unknown) =>
        toast.error(getApiErrorMessage(error, "Failed to fetch departments")),
      );
  }, [user?.tenantId]);

  // --- Handlers ---
  const handleOpenModal = (ward?: Ward) => {
    if (ward) {
      setEditingWard(ward);
      form.setFieldsValue({
        name: ward.name,
        departmentId: ward.departmentId,
      });
    } else {
      setEditingWard(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    form.resetFields();
    setEditingWard(null);
  };

  const handleSubmit = async (values: { name: string; departmentId?: string }) => {
    setSubmitLoading(true);
    try {
      if (editingWard) {
        await updateWard(editingWard.id, {
          name: values.name,
          departmentId: values.departmentId ?? null,
        });
        toast.success("Ward updated successfully.");
      } else {
        await createWard({
          name: values.name,
          departmentId: values.departmentId ?? null,
        });
        toast.success("Ward created successfully.");
      }
      await fetchWards(pagination.page, searchQuery);
      handleCloseModal();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Could not save ward"));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (wardId: string) => {
    try {
      await deleteWard(wardId);
      toast.success("Ward deleted successfully.");
      await fetchWards(pagination.page, searchQuery);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to delete ward"));
    }
  };

  // --- Table Columns ---
  const columns = [
    {
      title: 'Ward Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Flex align="center" gap={12}>
          <div style={{ padding: 8, background: '#E0F2FE', borderRadius: 8, color: themeConfig.token.colorInfo }}>
            <LayoutDashboard size={18} />
          </div>
          <Text strong style={{ fontSize: 14 }}>{text}</Text>
        </Flex>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'departmentId',
      key: 'departmentId',
      render: (_: unknown, record: Ward) => (
        record.Department ? (
          <Tag icon={<Building2 size={12} style={{ marginRight: 4 }}/>} color="blue" style={{ borderRadius: 12, padding: '2px 10px' }}>
            {record.Department.name}
          </Tag>
        ) : (
          <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 13 }}>Unassigned</Text>
        )
      ),
    },
    {
      title: 'Rooms',
      dataIndex: '_count',
      key: 'rooms',
      render: (count: { Room: number }) => (
        <Tag 
          color={count.Room > 0 ? 'success' : 'default'} 
          style={{ borderRadius: 12, padding: '2px 12px', fontWeight: 600 }}
        >
          {count.Room} {count.Room === 1 ? 'Room' : 'Rooms'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: Ward) => (
        <Space size="middle">
          <Tooltip title="Edit Ward">
            <Button 
              type="text" 
              icon={<Edit2 size={16} color={themeConfig.token.colorPrimary} />} 
              onClick={() => handleOpenModal(record)}
            />
          </Tooltip>
          <Tooltip title={record._count?.Room ? "Cannot delete ward with active rooms" : "Delete Ward"}>
            <Popconfirm
              title="Delete Ward"
              description="Are you sure you want to delete this ward?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes, Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
              disabled={!!record._count?.Room}
            >
              <Button 
                type="text" 
                danger 
                icon={<Trash2 size={16} />} 
                disabled={!!record._count?.Room}
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
              Ward Management
            </Title>
            <Text type="secondary" style={{ fontSize: 15, marginTop: 4, display: 'block' }}>
              Create and manage hospital wards and assign them to departments.
            </Text>
          </div>
          <Button 
            type="primary" 
            size="large" 
            icon={<Plus size={18} />} 
            onClick={() => handleOpenModal()}
            style={{ fontWeight: 600, borderRadius: 8 }}
          >
            Add New Ward
          </Button>
        </Flex>

        {/* Data Card */}
        <Card bordered={false} style={{ boxShadow: themeConfig.token.boxShadowTertiary, padding: '8px 0' }}>
          
          {/* Toolbar */}
          <Flex justify="space-between" align="center" style={{ marginBottom: 24, padding: '0 24px' }}>
            <Input
              placeholder="Search wards by name..."
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
            dataSource={wards} 
            rowKey="id"
            loading={loading}
            pagination={{
              current: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total,
              onChange: (page) => void fetchWards(page, searchQuery),
              showSizeChanger: false,
            }}
          />
        </Card>

        {/* Create / Edit Modal */}
        <Modal
          title={
            <Text style={{ fontSize: 18, fontWeight: 700, color: themeConfig.token.colorPrimary }}>
              {editingWard ? "Edit Ward Details" : "Create New Ward"}
            </Text>
          }
          open={isModalOpen}
          onCancel={handleCloseModal}
          footer={null}
          destroyOnClose
          zIndex={1100}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            style={{ marginTop: 24 }}
            requiredMark="optional"
          >
            <Form.Item 
              name="name" 
              label={<Text strong style={{ color: '#475569' }}>Ward Name <span style={{ color: themeConfig.token.colorError }}>*</span></Text>}
              rules={[
                { required: true, message: "Ward name is required" },
                { min: 2, message: "Name must be at least 2 characters" }
              ]}
            >
              <Input size="large" placeholder="e.g. Intensive Care Unit (ICU)" />
            </Form.Item>

            <Form.Item 
              name="departmentId" 
              label={<Text strong style={{ color: '#475569' }}>Department Assignment</Text>}
              tooltip="Optional: Link this ward to a specific hospital department."
            >
              <Select 
                size="large" 
                placeholder="Select a department (Optional)"
                allowClear
                options={departments.map((department) => ({
                  value: department.id,
                  label: department.name,
                }))}
              />
            </Form.Item>

            <Flex justify="flex-end" gap={12} style={{ marginTop: 32 }}>
              <Button size="large" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="primary" size="large" htmlType="submit" loading={submitLoading} style={{ fontWeight: 600 }}>
                {editingWard ? "Save Changes" : "Create Ward"}
              </Button>
            </Flex>
          </Form>
        </Modal>

      </div>
    </ConfigProvider>
  );
};