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
  DoorOpen,
  BedDouble,
  LayoutDashboard
} from "lucide-react";
import {
  createRoom,
  deleteRoom,
  getAllWards,
  getApiErrorMessage,
  getRooms,
  updateRoom,
} from "../../services/api";
import { toast } from "react-toastify";

const { Title, Text } = Typography;


interface Room {
  id: string;
  name: string;
  wardId: string;
  Ward?: {
    id: string;
    name: string;
  };
  tenantId: string;
  _count?: {
    Bed: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

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

export const Room: React.FC = () => {
  const [form] = Form.useForm();
  
  // State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [wards, setWards] = useState<{ id: string; name: string }[]>([]); // For the dropdown
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchWards = async () => {
    try {
      const response = await getAllWards();
      setWards(response.map(({ id, name }) => ({ id, name })));
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to fetch wards"));
    }
  };

  const fetchRooms = async (page = 1, search = "") => {
    setLoading(true);
    try {
      const response = await getRooms({ page, limit: 10, search: search || undefined });
      setRooms(response.items);
      setPagination(response.pagination);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to fetch rooms"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchWards();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchRooms(1, searchQuery);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  // --- Handlers ---
  const handleOpenModal = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      form.setFieldsValue({
        name: room.name,
        wardId: room.wardId,
      });
    } else {
      setEditingRoom(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    form.resetFields();
    setEditingRoom(null);
  };

  const handleSubmit = async (values: { name: string; wardId: string }) => {
    setSubmitLoading(true);
    try {
      if (editingRoom) {
        await updateRoom(editingRoom.id, values);
        toast.success("Room updated successfully.");
      } else {
        await createRoom(values);
        toast.success("Room created successfully.");
      }
      await fetchRooms(pagination.page, searchQuery);
      handleCloseModal();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Could not save room"));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (roomId: string, bedCount: number) => {
    // Matches the backend check: if (bedCount > 0) throw ApiError(409)
    if (bedCount > 0) {
      toast.warning(`Cannot delete room. It still has ${bedCount} active beds attached.`);
      return;
    }
    
    try {
      await deleteRoom(roomId);
      toast.success("Room deleted successfully.");
      await fetchRooms(pagination.page, searchQuery);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to delete room"));
    }
  };

  // --- Table Columns ---
  const columns = [
    {
      title: 'Room Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Flex align="center" gap={12}>
          <div style={{ padding: 8, background: '#F3E8FF', borderRadius: 8, color: '#9333EA' }}>
            <DoorOpen size={18} />
          </div>
          <Text strong style={{ fontSize: 14 }}>{text}</Text>
        </Flex>
      ),
    },
    {
      title: 'Assigned Ward',
      key: 'ward',
      render: (_: unknown, record: Room) => (
        record.Ward ? (
          <Tag icon={<LayoutDashboard size={12} style={{ marginRight: 4 }}/>} color="blue" style={{ borderRadius: 12, padding: '4px 10px', fontSize: 13 }}>
            {record.Ward.name}
          </Tag>
        ) : (
          <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 13 }}>Unknown Ward</Text>
        )
      ),
    },
    {
      title: 'Beds',
      dataIndex: '_count',
      key: 'beds',
      render: (count: { Bed: number }) => (
        <Flex align="center" gap={6}>
          <BedDouble size={16} color={count.Bed > 0 ? themeConfig.token.colorPrimary : '#94A3B8'} />
          <Text strong style={{ color: count.Bed > 0 ? '#1E293B' : '#94A3B8' }}>
            {count.Bed} {count.Bed === 1 ? 'Bed' : 'Beds'}
          </Text>
        </Flex>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: Room) => (
        <Space size="middle">
          <Tooltip title="Edit Room">
            <Button 
              type="text" 
              icon={<Edit2 size={16} color={themeConfig.token.colorPrimary} />} 
              onClick={() => handleOpenModal(record)}
            />
          </Tooltip>
          <Tooltip title={record._count?.Bed ? "Cannot delete room with assigned beds" : "Delete Room"}>
            <Popconfirm
              title="Delete Room"
              description="Are you sure you want to delete this room?"
              onConfirm={() => handleDelete(record.id, record._count?.Bed || 0)}
              okText="Yes, Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
              disabled={!!record._count?.Bed}
            >
              <Button 
                type="text" 
                danger 
                icon={<Trash2 size={16} />} 
                disabled={!!record._count?.Bed}
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
              Room Management
            </Title>
            <Text type="secondary" style={{ fontSize: 15, marginTop: 4, display: 'block' }}>
              Configure hospital rooms and assign them to specific wards.
            </Text>
          </div>
          <Button 
            type="primary" 
            size="large" 
            icon={<Plus size={18} />} 
            onClick={() => handleOpenModal()}
            style={{ fontWeight: 600, borderRadius: 8 }}
          >
            Add New Room
          </Button>
        </Flex>

        {/* Data Card */}
        <Card bordered={false} style={{ boxShadow: themeConfig.token.boxShadowTertiary, padding: '8px 0' }}>
          
          {/* Toolbar */}
          <Flex justify="space-between" align="center" style={{ marginBottom: 24, padding: '0 24px' }}>
            <Input
              placeholder="Search rooms by name..."
              prefix={<Search size={16} color="#94A3B8" />}
              size="large"
              style={{ width: 320, borderRadius: 8 }}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
            {/* You could add a Ward Filter dropdown here in the future if needed based on listRoomsQuerySchema */}
          </Flex>

          {/* Table */}
          <Table 
            columns={columns} 
            dataSource={rooms} 
            rowKey="id"
            loading={loading}
            pagination={{
              current: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total,
              onChange: (page) => void fetchRooms(page, searchQuery),
              showSizeChanger: false,
            }}
          />
        </Card>

        {/* Create / Edit Modal */}
        <Modal
          title={
            <Text style={{ fontSize: 18, fontWeight: 700, color: themeConfig.token.colorPrimary }}>
              {editingRoom ? "Edit Room Details" : "Create New Room"}
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
              label={<Text strong style={{ color: '#475569' }}>Room Name / Number <span style={{ color: themeConfig.token.colorError }}>*</span></Text>}
              rules={[
                { required: true, message: "Room name is required" },
                { max: 50, message: "Name cannot exceed 50 characters" }
              ]}
            >
              <Input size="large" placeholder="e.g. Room 101, ICU Bed Area 1" />
            </Form.Item>

            <Form.Item 
              name="wardId" 
              label={<Text strong style={{ color: '#475569' }}>Assigned Ward <span style={{ color: themeConfig.token.colorError }}>*</span></Text>}
              rules={[{ required: true, message: "Please assign this room to a ward" }]}
              tooltip="A room must belong to a ward based on hospital layout."
            >
              <Select 
                size="large" 
                placeholder="Select a ward"
                options={wards.map(w => ({ value: w.id, label: w.name }))}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>

            <Flex justify="flex-end" gap={12} style={{ marginTop: 32 }}>
              <Button size="large" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="primary" size="large" htmlType="submit" loading={submitLoading} style={{ fontWeight: 600 }}>
                {editingRoom ? "Save Changes" : "Create Room"}
              </Button>
            </Flex>
          </Form>
        </Modal>

      </div>
    </ConfigProvider>
  );
};