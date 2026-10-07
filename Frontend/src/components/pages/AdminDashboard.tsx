import React from 'react';
import { ConfigProvider, Card, Typography, Button, Space, Row, Col, Table, Progress, Avatar, Flex, Tag } from 'antd';
import { 
  Users, 
  Bed, 
  UserCheck, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Download, 
  Plus, 

} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const { Title, Text } = Typography;

// --- Chart Mock Data ---
const departmentBarData = [
  { name: 'Cardiology', appointments: 42 },
  { name: 'Neurology', appointments: 28 },
  { name: 'Pediatrics', appointments: 35 },
  { name: 'Radiology', appointments: 20 },
  { name: 'Orthopedics', appointments: 30 },
];

const waitTimeData = [
  { time: '8a', wait: 12 },
  { time: '10a', wait: 25 },
  { time: '12p', wait: 18 },
  { time: '2p', wait: 30 },
  { time: '4p', wait: 22 },
  { time: '6p', wait: 15 },
];

const admissionsTrendData = [
  { month: 'Jan', current: 1200, previous: 900 },
  { month: 'Feb', current: 1800, previous: 1300 },
  { month: 'Mar', current: 1400, previous: 1100 },
  { month: 'Apr', current: 2200, previous: 1600 },
  { month: 'May', current: 1900, previous: 1500 },
  { month: 'Jun', current: 2500, previous: 2000 },
];

const departmentPieData = [
  { name: 'Dermatology', value: 35, color: '#0F766E' },
  { name: 'Neurology', value: 25, color: '#0284C7' },
  { name: 'Orthopedics', value: 20, color: '#16A34A' },
  { name: 'Pediatrics', value: 20, color: '#D97706' },
];

// --- Table Columns ---
const recentAppointmentsColumns = [
  {
    title: 'Patient',
    dataIndex: 'patient',
    key: 'patient',
    render: (text: string) => <Text strong>{text}</Text>,
  },
  {
    title: 'Doctor',
    dataIndex: 'doctor',
    key: 'doctor',
  },
  {
    title: 'Date & Time',
    dataIndex: 'datetime',
    key: 'datetime',
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => {
      let color = 'default';
      if (status === 'Confirmed') color = 'success';
      if (status === 'Pending') color = 'warning';
      if (status === 'Completed') color = 'processing';
      return <Tag color={color}>{status}</Tag>;
    },
  },
  {
    title: 'Actions',
    key: 'actions',
    render: () => (
      <Space>
        <Button size="small" type="primary" ghost>View</Button>
      </Space>
    ),
  },
];

const recentAppointmentsData = [
  { key: '1', patient: 'John Doe', doctor: 'Dr. Sarah Smith (Cardiology)', datetime: 'Today, Sep 4 • 10:00 AM', status: 'Confirmed' },
  { key: '2', patient: 'Jane Smith', doctor: 'Dr. Michael Johnson (Neurology)', datetime: 'Today, Sep 4 • 11:30 AM', status: 'Pending' },
  { key: '3', patient: 'Robert Brown', doctor: 'Dr. Emily Williams (Pediatrics)', datetime: 'Tomorrow, Sep 5 • 09:15 AM', status: 'Completed' },
];

export const AdminDashboard: React.FC = () => {
  // --- Theme Configuration using our Variables ---
  const themeConfig = {
    token: {
      colorPrimary: '#0F766E', // Deep Teal
      colorInfo: '#0284C7',     // Blue
      colorSuccess: '#16A34A',  // Green
      colorWarning: '#D97706',  // Amber
      colorError: '#DC2626',    // Red
      colorTextBase: '#1E293B',
      colorBgLayout: '#F1F5F9',
      borderRadius: 8,
      fontFamily: '"Inter", sans-serif',
      boxShadowTertiary: '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.06)',
    },
  };

  return (
    <ConfigProvider theme={themeConfig}>
      <div style={{ minHeight: '100vh', padding: 24, backgroundColor: themeConfig.token.colorBgLayout }}>
        
        {/* Top Welcome Banner Card */}
        <Card 
          bordered={false} 
          style={{ 
            background: 'linear-gradient(135deg, #0F766E 0%, #0284C7 100%)', 
            borderRadius: 12, 
            marginBottom: 24,
            color: '#ffffff'
          }}
          bodyStyle={{ padding: '24px 32px' }}
        >
          <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
            <Flex vertical gap={8}>
              <Tag color="rgba(255, 255, 255, 0.2)" style={{ width: 'fit-content', color: '#fff', border: 'none' }}>Admin Portal</Tag>
              <Title level={2} style={{ color: '#ffffff', margin: 0 }}>Welcome, Dr. John! 👋</Title>
              <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 15 }}>
                Your hospital overview is looking pristine today. You have 48 appointments and 12 new patients pending review.
              </Text>
              <Space style={{ marginTop: 8 }}>
                <Button type="primary" ghost style={{ borderColor: '#fff', color: '#fff' }} icon={<FileText size={16} />}>View Schedule</Button>
                <Button style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#fff' }} icon={<Download size={16} />}>Generate Report</Button>
              </Space>
            </Flex>
            <Avatar size={72} src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop" style={{ border: '2px solid #fff' }} />
          </Flex>
        </Card>

        {/* Top 4 KPI Metrics Row */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ boxShadow: themeConfig.token.boxShadowTertiary }}>
              <Flex justify="space-between" align="flex-start">
                <Flex vertical>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total Patients</Text>
                  <Title level={3} style={{ margin: '8px 0 4px 0' }}>2,543</Title>
                  <Flex align="center" gap={4} style={{ color: themeConfig.token.colorSuccess, fontSize: 12, fontWeight: 600 }}>
                    <TrendingUp size={14} /> +12%
                  </Flex>
                </Flex>
                <Flex align="center" justify="center" style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(2, 132, 199, 0.1)', color: themeConfig.token.colorInfo }}>
                  <Users size={20} />
                </Flex>
              </Flex>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ boxShadow: themeConfig.token.boxShadowTertiary }}>
              <Flex justify="space-between" align="flex-start">
                <Flex vertical>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Available Beds</Text>
                  <Title level={3} style={{ margin: '8px 0 4px 0' }}>156</Title>
                  <Flex align="center" gap={4} style={{ color: themeConfig.token.colorSuccess, fontSize: 12, fontWeight: 600 }}>
                    <TrendingUp size={14} /> +4%
                  </Flex>
                </Flex>
                <Flex align="center" justify="center" style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(22, 163, 74, 0.1)', color: themeConfig.token.colorSuccess }}>
                  <Bed size={20} />
                </Flex>
              </Flex>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ boxShadow: themeConfig.token.boxShadowTertiary }}>
              <Flex justify="space-between" align="flex-start">
                <Flex vertical>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Doctors on Duty</Text>
                  <Title level={3} style={{ margin: '8px 0 4px 0' }}>89</Title>
                  <Flex align="center" gap={4} style={{ color: themeConfig.token.colorError, fontSize: 12, fontWeight: 600 }}>
                    <TrendingDown size={14} /> -2%
                  </Flex>
                </Flex>
                <Flex align="center" justify="center" style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(15, 118, 110, 0.1)', color: themeConfig.token.colorPrimary }}>
                  <UserCheck size={20} />
                </Flex>
              </Flex>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ boxShadow: themeConfig.token.boxShadowTertiary }}>
              <Flex justify="space-between" align="flex-start">
                <Flex vertical>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Active Appointments</Text>
                  <Title level={3} style={{ margin: '8px 0 4px 0' }}>324</Title>
                  <Flex align="center" gap={4} style={{ color: themeConfig.token.colorSuccess, fontSize: 12, fontWeight: 600 }}>
                    <TrendingUp size={14} /> +8.5%
                  </Flex>
                </Flex>
                <Flex align="center" justify="center" style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(217, 119, 6, 0.1)', color: themeConfig.token.colorWarning }}>
                  <Calendar size={20} />
                </Flex>
              </Flex>
            </Card>
          </Col>
        </Row>

        {/* Charts Row 1: Appointments by Department & Average Wait Time */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12}>
            <Card title="Appointments by Department" bordered={false} style={{ boxShadow: themeConfig.token.boxShadowTertiary, height: '100%' }}>
              <div style={{ height: 260, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentBarData}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: themeConfig.token.boxShadowTertiary }} />
                    <Bar dataKey="appointments" fill={themeConfig.token.colorPrimary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Average Wait Time (mins)" bordered={false} style={{ boxShadow: themeConfig.token.boxShadowTertiary, height: '100%' }}>
              <div style={{ height: 260, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={waitTimeData}>
                    <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: themeConfig.token.boxShadowTertiary }} />
                    <Area type="monotone" dataKey="wait" stroke={themeConfig.token.colorInfo} fillOpacity={0.15} fill={themeConfig.token.colorInfo} strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Charts Row 2: Patient Admissions Trend & Department Distribution */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={14}>
            <Card title="Patient Admissions" bordered={false} style={{ boxShadow: themeConfig.token.boxShadowTertiary, height: '100%' }}>
              <div style={{ height: 280, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={admissionsTrendData}>
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: themeConfig.token.boxShadowTertiary }} />
                    <Area type="monotone" dataKey="current" name="Current Month" stroke={themeConfig.token.colorPrimary} fillOpacity={0.2} fill={themeConfig.token.colorPrimary} strokeWidth={3} />
                    <Area type="monotone" dataKey="previous" name="Previous Month" stroke="#94a3b8" fillOpacity={0.1} fill="#94a3b8" strokeWidth={2} strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Card title="Department Distribution" bordered={false} style={{ boxShadow: themeConfig.token.boxShadowTertiary, height: '100%' }}>
              <div style={{ height: 280, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={departmentPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} label>
                      {departmentPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: themeConfig.token.boxShadowTertiary }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Bed Occupancy & Progress Metrics Row */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12}>
            <Card title="Bed Occupancy by Ward" bordered={false} style={{ boxShadow: themeConfig.token.boxShadowTertiary }}>
              <Flex vertical gap={16}>
                <div>
                  <Flex justify="space-between" style={{ marginBottom: 4 }}><Text>ICU</Text><Text strong>82% (32/39)</Text></Flex>
                  <Progress percent={82} strokeColor={themeConfig.token.colorError} showInfo={false} />
                </div>
                <div>
                  <Flex justify="space-between" style={{ marginBottom: 4 }}><Text>General Ward</Text><Text strong>65% (65/100)</Text></Flex>
                  <Progress percent={65} strokeColor={themeConfig.token.colorInfo} showInfo={false} />
                </div>
                <div>
                  <Flex justify="space-between" style={{ marginBottom: 4 }}><Text>Pediatrics</Text><Text strong>45% (18/40)</Text></Flex>
                  <Progress percent={45} strokeColor={themeConfig.token.colorSuccess} showInfo={false} />
                </div>
              </Flex>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Operational Performance" bordered={false} style={{ boxShadow: themeConfig.token.boxShadowTertiary }}>
              <Flex vertical gap={16}>
                <div>
                  <Flex justify="space-between" style={{ marginBottom: 4 }}><Text>Staff Availability</Text><Text strong>94%</Text></Flex>
                  <Progress percent={94} strokeColor={themeConfig.token.colorPrimary} showInfo={false} />
                </div>
                <div>
                  <Flex justify="space-between" style={{ marginBottom: 4 }}><Text>Surgery Success Rate</Text><Text strong>98.5%</Text></Flex>
                  <Progress percent={98.5} strokeColor={themeConfig.token.colorSuccess} showInfo={false} />
                </div>
                <div>
                  <Flex justify="space-between" style={{ marginBottom: 4 }}><Text>Patient Satisfaction</Text><Text strong>91%</Text></Flex>
                  <Progress percent={91} strokeColor={themeConfig.token.colorWarning} showInfo={false} />
                </div>
              </Flex>
            </Card>
          </Col>
        </Row>

        {/* Recent Appointments Data Table */}
        <Card 
          title="Recent Appointments" 
          extra={<Button type="primary" icon={<Plus size={16} />}>New Appointment</Button>}
          bordered={false} 
          style={{ boxShadow: themeConfig.token.boxShadowTertiary }}
        >
          <Table 
            dataSource={recentAppointmentsData} 
            columns={recentAppointmentsColumns} 
            pagination={false} 
          />
        </Card>

      </div>
    </ConfigProvider>
  );
};