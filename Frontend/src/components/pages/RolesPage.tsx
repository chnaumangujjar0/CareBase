import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  ConfigProvider,
  Empty,
  Flex,
  Grid,
  Modal,
  Pagination,
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
import { createRole, deleteRole, getApiErrorMessage, getRoleCatalog, getRoles, updateRole } from '../../services/api';
import type { RoleRecord, StandardRoleOption } from '../../types/global.types';
import { appTheme } from '../../theme';

const { Title, Text } = Typography;

export const RolesPage = () => {
  const screens = Grid.useBreakpoint();
  const isCompact = !screens.lg;
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roleCatalog, setRoleCatalog] = useState<StandardRoleOption[]>([]);
  const pageSize = 10;

  const loadRoles = useCallback(async (requestedPage: number) => {
    setLoading(true);
    try {
      const result = await getRoles({ page: requestedPage, limit: pageSize });
      setRoles(result.roles);
      setTotal(result.total);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load roles"));
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

  useEffect(() => {
    void getRoleCatalog().then(setRoleCatalog).catch((error) => {
      toast.error(getApiErrorMessage(error, "Could not load standard roles"));
    });
  }, []);

  const openCreateModal = () => {
    setEditingRole(null);
    setRoleName('');
    setPermissions([]);
    setModalOpen(true);
  };

  const openEditModal = (role: RoleRecord) => {
    setEditingRole(role);
    setRoleName(role.name);
    setPermissions(roleCatalog.find((option) => option.name === role.name)?.permissions ?? role.permissions);
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
      const selected = roleCatalog.find((role) => role.name === name);
      if (!selected) {
        toast.error('Select a standard role');
        return;
      }
      const payload = { name: selected.name };
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
      toast.error(getApiErrorMessage(error, "Could not save role"));
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
      toast.error(getApiErrorMessage(error, "Could not delete role"));
    }
  };

  const columns: TableProps<RoleRecord>['columns'] = [
    {
      title: 'ROLE AUTHORITY',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (name: string, role) => (
        <Flex align="center" gap={16}>
          <Shield />
          <div>
            <Text strong style={{ display: 'block', color: '#0F172A', overflowWrap: 'anywhere' }}>{name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{role.code}</Text>
          </div>
        </Flex>
      ),
    },
    {
      title: 'PERMISSIONS',
      dataIndex: 'permissions',
      key: 'permissions',
      width: 640,
      render: (rolePermissions: string[], role) => {
        const grantedPermissions = roleCatalog.find((option) => option.name === role.name)?.permissions ?? rolePermissions;
        return (
        <Space size={[6, 6]} wrap>
          <Lock size={14} color="#64748b" />
          {grantedPermissions.length ? grantedPermissions.map((permission) => (
            <Tag key={permission}>{permission}</Tag>
          )) : <Text type="secondary">No permissions</Text>}
        </Space>
        );
      },
    },
    {
      title: 'USERS',
      dataIndex: 'userCount',
      key: 'userCount',
      width: 120,
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
      width: 120,
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
    <ConfigProvider theme={appTheme}>
      <div style={{ minHeight: '100%', padding: 'clamp(12px, 2vw, 24px)', backgroundColor: appTheme.token?.colorBgLayout }}>
        <Flex justify="flex-start" align="center" style={{ marginBottom: 20 }}>
          <Title level={3} style={{ margin: 0, fontWeight: 600, color: '#0F172A' }}>
            User Roles & Permissions
          </Title>
        </Flex>

        <Card
          bordered={false}
          style={{ boxShadow: appTheme.token?.boxShadowTertiary, borderRadius: 12 }}
          bodyStyle={{ padding: 'clamp(14px, 2vw, 24px)' }}
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

          {isCompact ? (
            <Flex vertical gap={12}>
              {loading && roles.length === 0 ? <Card loading /> : roles.length === 0 ? <Empty description="No roles found" /> : roles.map((role) => {
                const grantedPermissions = roleCatalog.find((option) => option.name === role.name)?.permissions ?? role.permissions;
                return (
                  <Card key={role.id} size="small" styles={{ body: { padding: 16 } }}>
                    <Flex vertical gap={14}>
                      <Flex align="flex-start" justify="space-between" gap={12}>
                        <Flex align="center" gap={12} style={{ minWidth: 0 }}>
                          <Shield size={20} color="#0F766E" />
                          <div style={{ minWidth: 0 }}>
                            <Text strong style={{ display: 'block', overflowWrap: 'anywhere' }}>{role.name}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>{role.code}</Text>
                          </div>
                        </Flex>
                        <Space size={4}>
                          <Button type="text" aria-label={`Edit ${role.name}`} icon={<Edit2 size={16} />} onClick={() => openEditModal(role)} />
                          <Popconfirm
                            title="Delete this role?"
                            description={role.userCount > 0 ? 'Roles assigned to users cannot be deleted.' : undefined}
                            onConfirm={() => void removeRole(role)}
                            okText="Delete"
                            okButtonProps={{ danger: true }}
                          >
                            <Button type="text" danger aria-label={`Delete ${role.name}`} icon={<Trash2 size={16} />} disabled={role.userCount > 0} />
                          </Popconfirm>
                        </Space>
                      </Flex>
                      <div>
                        <Text type="secondary" style={{ display: 'block', fontSize: 11, marginBottom: 6 }}>PERMISSIONS</Text>
                        <Space size={[6, 6]} wrap>
                          {grantedPermissions.length ? grantedPermissions.map((permission) => <Tag key={permission}>{permission}</Tag>) : <Text type="secondary">No permissions</Text>}
                        </Space>
                      </div>
                      <Text type="secondary">{role.userCount} {role.userCount === 1 ? 'user' : 'users'} assigned</Text>
                    </Flex>
                  </Card>
                );
              })}
              {total > pageSize && (
                <Flex justify="center">
                  <Pagination current={page} pageSize={pageSize} total={total} onChange={setPage} showSizeChanger={false} size="small" />
                </Flex>
              )}
            </Flex>
          ) : (
            <Table<RoleRecord>
              rowKey="id"
              dataSource={roles}
              columns={columns}
              loading={loading}
              tableLayout="fixed"
              scroll={{ x: 1080 }}
              locale={{ emptyText: <Empty description="No roles found" /> }}
              pagination={{ current: page, pageSize, total, showSizeChanger: false, onChange: setPage }}
            />
          )}
        </Card>

        <Modal
          title={editingRole ? 'Edit Role' : 'Create New Role'}
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          onOk={() => void saveRole()}
          confirmLoading={saving}
          okText={editingRole ? 'Save Changes' : 'Create Role'}
          destroyOnHidden
          width={isCompact ? 'calc(100vw - 24px)' : 560}
          styles={{ body: { maxHeight: 'min(70vh, 640px)', overflowY: 'auto' } }}
        >
          <Flex vertical gap={8}>
            <Text strong>Role name</Text>
            <Select
              value={roleName}
              onChange={(value) => {
                setRoleName(value);
                setPermissions(roleCatalog.find((role) => role.name === value)?.permissions ?? []);
              }}
              placeholder="Select a standard role"
              options={roleCatalog.map((role) => ({ label: role.name, value: role.name }))}
            />
            <Text strong style={{ marginTop: 12 }}>Permissions granted by this role</Text>
            <Text type="secondary">
              Permissions are managed by the system and cannot be added manually.
            </Text>
            <Space size={[6, 6]} wrap>
              {permissions.map((permission) => <Tag key={permission}>{permission}</Tag>)}
            </Space>
          </Flex>
        </Modal>
      </div>
    </ConfigProvider>
  );
};
