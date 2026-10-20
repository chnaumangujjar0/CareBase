import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  ConfigProvider,
  Descriptions,
  Empty,
  Input,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { getApiErrorMessage, getAuditLogs } from "../../services/api";
import type { AuditLogEntry } from "../../types/global.types";
import PageSkeleton from "../common/PageSkeleton";

const { Title, Text } = Typography;
const pageSize = 25;

const themeConfig = {
  token: {
    colorPrimary: '#0F766E',
    colorTextBase: '#475569',
    fontFamily: '"Inter", sans-serif',
    borderRadius: 8,
  },
};

export default function AuditLogs() {
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAuditLogs({
        page,
        limit: pageSize,
        ...(actionFilter.trim() ? { action: actionFilter.trim() } : {}),
        ...(entityFilter.trim() ? { entityType: entityFilter.trim() } : {}),
      });
      setItems(result.items);
      setTotal(result.pagination.total);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load audit logs"));
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityFilter, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const columns: TableProps<AuditLogEntry>["columns"] = [
    {
      title: "DATE & TIME",
      dataIndex: "createdAt",
      render: (value: string) => dayjs(value).format("MMM D, YYYY h:mm:ss A"),
      width: 210,
    },
    {
      title: "USER",
      key: "user",
      render: (_, entry) => entry.User ? (
        <div>
          <Text strong>{entry.User.name}</Text>
          <Text type="secondary" style={{ display: "block" }}>{entry.User.email}</Text>
        </div>
      ) : "System / unavailable",
    },
    {
      title: "ACTION",
      dataIndex: "action",
      render: (action: string) => <Tag color="blue">{action}</Tag>,
      width: 130,
    },
    { title: "ENTITY", dataIndex: "entityType", width: 170 },
    {
      title: "ENTITY ID",
      dataIndex: "entityId",
      render: (entityId?: string | null) => entityId ?? "—",
      width: 250,
    },
    {
      title: "IP ADDRESS",
      dataIndex: "ipAddress",
      render: (ipAddress?: string | null) => ipAddress ?? "—",
      width: 150,
    },
  ];

  if (loading && items.length === 0) return <PageSkeleton />;

  return (
    <ConfigProvider theme={themeConfig}>
    <div style={{ padding: 24, background: "#f8fafc", minHeight: "100%" }}>
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Audit Logs</Title>
          <Text type="secondary">Review user activity and record changes in this hospital.</Text>
        </div>
        <Button onClick={() => void load()} loading={loading}>Refresh</Button>
      </Space>
      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            allowClear
            aria-label="Filter by action"
            placeholder="Filter by action"
            value={actionFilter}
            onChange={(event) => {
              setActionFilter(event.target.value);
              setPage(1);
            }}
            style={{ width: 220 }}
          />
          <Input
            allowClear
            aria-label="Filter by entity"
            placeholder="Filter by entity"
            value={entityFilter}
            onChange={(event) => {
              setEntityFilter(event.target.value);
              setPage(1);
            }}
            style={{ width: 220 }}
          />
        </Space>
        <Table<AuditLogEntry>
          rowKey="id"
          columns={columns}
          dataSource={items}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: false,
            onChange: setPage,
          }}
          expandable={{
            expandedRowRender: (entry) => (
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="Old value">
                  <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{entry.oldValue == null ? "—" : JSON.stringify(entry.oldValue, null, 2)}</pre>
                </Descriptions.Item>
                <Descriptions.Item label="New value">
                  <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{entry.newValue == null ? "—" : JSON.stringify(entry.newValue, null, 2)}</pre>
                </Descriptions.Item>
                <Descriptions.Item label="User agent">{entry.userAgent ?? "—"}</Descriptions.Item>
              </Descriptions>
            ),
          }}
          locale={{ emptyText: <Empty description="No audit log entries found" /> }}
          scroll={{ x: 1100 }}
        />
      </Card>
    </div>
    </ConfigProvider>
  );
}
