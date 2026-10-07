import { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import {
  Button,
  Card,
  ConfigProvider,
  Empty,
  Flex,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { TableProps } from 'antd';
import { Edit2, Lock, Plus, Shield, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { createRole, deleteRole, getRoles, updateRole } from '../../services/api';
import type { RoleRecord } from '../../types/global.types';

const { Title, Text } = Typography;

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

function getErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}

export const RolesPage = () => {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const pageSize = 10;

  const loadRoles = useCallback(async (requestedPage: number) => {
    setLoading(true);
    try {
      const result = await getRoles({ page: requestedPage, limit: pageSize });
      setRoles(result.roles);
      setTotal(result.total);
    } catch (error) {
      toast.error(`Could not load roles: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRoles(page);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRoles, page]);

  const openCreateModal = () => {
    setEditingRole(null);
    setRoleName('');
    setPermissions([]);
    setModalOpen(true);
  };

  const openEditModal = (role: RoleRecord) => {
    setEditingRole(role);
    setRoleName(role.name);
    setPermissions(role.permissions);
    setModalOpen(true);
  };

  const saveRole = async () => {
    const name = roleName.trim();
    if (name.length < 2) {
      toast.error('Role name must be at least 2 characters');
      return;
    }

    setSaving(true);
    try {
      const payload = { name, permissions };
      if (editingRole) {
        await updateRole(editingRole.id, payload);
        toast.success('Role updated');
        setModalOpen(false);
        await loadRoles(page);
      } else {
        await createRole(payload);
        toast.success('Role created');
        setModalOpen(false);
        if (page !== 1) setPage(1);
        else await loadRoles(1);
      }
    } catch (error) {
      toast.error(`Could not save role: ${getErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const removeRole = async (role: RoleRecord) => {
    try {
      await deleteRole(role.id);
      toast.success('Role deleted');
      const nextPage = roles.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      else await loadRoles(page);
    } catch (error) {
      toast.error(`Could not delete role: ${getErrorMessage(error)}`);
    }
  };

  const columns: TableProps<RoleRecord>['columns'] = [
    {
      title: 'ROLE AUTHORITY',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, role) => (
        <Flex align="center" gap={16}>
          <Shield />
          <div>
            <Text strong style={{ display: 'block', color: '#0F172A' }}>{name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{role.code}</Text>
          </div>
        </Flex>
      ),
    },
    {
      title: 'PERMISSIONS',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (rolePermissions: string[]) => (
        <Space size={[6, 6]} wrap>
          <Lock size={14} color="#64748b" />
          {rolePermissions.length ? rolePermissions.map((permission) => (
            <Tag key={permission}>{permission}</Tag>
          )) : <Text type="secondary">No permissions</Text>}
        </Space>
      ),
    },
    {
      title: 'USERS',
      dataIndex: 'userCount',
      key: 'userCount',
      render: (count: number) => (
        <Space size={8}>
          <Tag style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284C7', border: 'none', fontWeight: 600 }}>
            {count}
          </Tag>
          <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase' }}>
            {count === 1 ? 'User' : 'Users'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'ACTIONS',
      key: 'actions',
      render: (_, role) => (
        <Space size={12}>
          <Button
            type="text"
            aria-label={`Edit ${role.name}`}
            icon={<Edit2 size={16} color="#64748b" />}
            onClick={() => openEditModal(role)}
          />
          <Popconfirm
            title="Delete this role?"
            description={role.userCount > 0 ? 'Roles assigned to users cannot be deleted.' : undefined}
            onConfirm={() => void removeRole(role)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              aria-label={`Delete ${role.name}`}
              icon={<Trash2 size={16} color="#DC2626" />}
              disabled={role.userCount > 0}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider theme={themeConfig}>
      <div style={{ minHeight: '100vh', padding: 24, backgroundColor: themeConfig.token.colorBgLayout }}>
        <Flex justify="flex-start" align="center" style={{ marginBottom: 20 }}>
          <Title level={3} style={{ margin: 0, fontWeight: 600, color: '#0F172A' }}>
            User Roles & Permissions
          </Title>
        </Flex>

        <Card
          bordered={false}
          style={{ boxShadow: themeConfig.token.boxShadowTertiary, borderRadius: 12 }}
          bodyStyle={{ padding: 24 }}
        >
          <Flex justify="space-between" align="center" wrap="wrap" gap={16} style={{ marginBottom: 24 }}>
            <div>
              <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: '#64748b', display: 'block', marginBottom: 4 }}>
                ACCESS CONTROL CENTER
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Configure staff roles and permissions
              </Text>
            </div>
            <Button type="primary" icon={<Plus size={16} />} onClick={openCreateModal}>
              Create New Role
            </Button>
          </Flex>

          <Table<RoleRecord>
            rowKey="id"
            dataSource={roles}
            columns={columns}
            loading={loading}
            locale={{ emptyText: <Empty description="No roles found" /> }}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: false,
              onChange: setPage,
            }}
          />
        </Card>

        <Modal
          title={editingRole ? 'Edit Role' : 'Create New Role'}
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          onOk={() => void saveRole()}
          confirmLoading={saving}
          okText={editingRole ? 'Save Changes' : 'Create Role'}
          destroyOnHidden
        >
          <Flex vertical gap={8}>
            <Text strong>Role name</Text>
            <Input
              value={roleName}
              onChange={(event) => setRoleName(event.target.value)}
              maxLength={60}
              placeholder="Enter role name"
              autoFocus
            />
            <Text strong style={{ marginTop: 12 }}>Permissions</Text>
            <Select
              mode="tags"
              value={permissions}
              onChange={setPermissions}
              tokenSeparators={[',']}
              placeholder="Type a permission and press Enter"
              options={Array.from(new Set(roles.flatMap((role) => role.permissions))).map((permission) => ({
                label: permission,
                value: permission,
              }))}
            />
          </Flex>
        </Modal>
      </div>
    </ConfigProvider>
  );
};
