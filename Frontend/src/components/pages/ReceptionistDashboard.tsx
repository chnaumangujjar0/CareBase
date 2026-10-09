import React, { useState } from "react";
import {
  ConfigProvider,
  Row,
  Col,
  Card,
  Typography,
  Flex,
  Button,
  Table,
  Tag,
  Avatar,
  List,
  Progress,
  Input,
  Select
} from "antd";
import {
  Plus,
  Search,
  MoreVertical,
  Calendar as CalendarIcon,
  Download,
  Filter
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

const { Title, Text } = Typography;

// --- Enterprise Theme Config ---
const themeConfig = {
  token: {
    colorPrimary: '#0F766E', // Deep Teal
    colorSuccess: '#10B981',
    colorWarning: '#F59E0B',
    colorError: '#EF4444',
    colorInfo: '#3B82F6',
    colorTextBase: '#334155',
    colorBgLayout: '#F8FAFC',
    colorBorder: '#E2E8F0',
    borderRadius: 12,
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    boxShadowTertiary: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
  },
  components: {
    Card: { borderRadiusLG: 16 },
    Table: {
      headerBg: '#F1F5F9',
      headerColor: '#475569',
      borderRadiusLG: 12,
    }
  }
};

// --- DUMMY DATA ---
const sparklineData1 = [{ v: 40 }, { v: 30 }, { v: 45 }, { v: 25 }, { v: 55 }, { v: 60 }];
const sparklineData2 = [{ v: 20 }, { v: 40 }, { v: 35 }, { v: 50 }, { v: 46 }, { v: 40 }];
const sparklineData3 = [{ v: 100 }, { v: 150 }, { v: 130 }, { v: 180 }, { v: 212 }, { v: 190 }];

const reportData = [
  { name: 'Urgent', value: 35, color: '#EF4444' },
  { name: 'Moderate', value: 25, color: '#F59E0B' },
  { name: 'Low', value: 15, color: '#10B981' },
];

const patientOverviewData = [
  { time: '01-07', new: 45, discharge: 20 },
  { time: '08-12', new: 52, discharge: 30 },
  { time: '13-17', new: 38, discharge: 25 },
  { time: '18-23', new: 65, discharge: 40 },
];

const successStats = [
  { dept: 'Anesthetics', value: 83, color: '#0EA5E9' },
  { dept: 'Gynecology', value: 95, color: '#F97316' },
  { dept: 'Neurology', value: 100, color: '#10B981' },
  { dept: 'Oncology', value: 89, color: '#A855F7' },
  { dept: 'Orthopedics', value: 97, color: '#F59E0B' },
  { dept: 'Physiotherapy', value: 100, color: '#EF4444' },
];

const doctorsList = [
  { id: 1, name: 'Dr. Brandon', spec: 'Gynecologist', avatar: 'https://i.pravatar.cc/150?u=1' },
  { id: 2, name: 'Dr. Gregory', spec: 'Cardiologist', avatar: 'https://i.pravatar.cc/150?u=2' },
  { id: 3, name: 'Dr. Robert', spec: 'Orthopedist', avatar: 'https://i.pravatar.cc/150?u=3' },
  { id: 4, name: 'Dr. Calvin', spec: 'Neurologist', avatar: 'https://i.pravatar.cc/150?u=4' },
];

const birthDeathData = [
  { name: 'Birth Case', value: 45, color: '#0EA5E9' },
  { name: 'Accident Case', value: 18, color: '#F59E0B' },
  { name: 'Death Case', value: 29, color: '#EF4444' },
];

const patientsTableData = [
  { key: '1', name: 'Sabrina Carpenter', idNum: 'BR263585643', date: '2024-01-06', diagnose: 'Bruised Rib', status: 'Urgent' },
  { key: '2', name: 'Rahul Mehta', idNum: 'BR263585655', date: '2024-01-06', diagnose: 'Fever', status: 'Moderate' },
  { key: '3', name: 'Aisha Khan', idNum: 'BR263585699', date: '2024-01-05', diagnose: 'Asthma', status: 'Low' },
  { key: '4', name: 'Emily Clark', idNum: 'BR263585701', date: '2024-01-04', diagnose: 'Migraine', status: 'Moderate' },
  { key: '5', name: 'John Doe', idNum: 'BR263585702', date: '2024-01-03', diagnose: 'Fracture', status: 'Urgent' },
];

// --- HELPER COMPONENTS ---
const SparklineCard = ({ title, value, subtitle, data, color }: any) => (
  <Card bordered={false} style={{ boxShadow: themeConfig.token.boxShadowTertiary, overflow: 'hidden' }} bodyStyle={{ padding: '20px 20px 0 20px' }}>
    <Text type="secondary" strong style={{ fontSize: 13, textTransform: 'uppercase' }}>{title}</Text>
    <Flex align="center" gap={12} style={{ marginTop: 4 }}>
      <Title level={2} style={{ margin: 0 }}>{value}</Title>
      <Tag color="blue" style={{ borderRadius: 12, border: 'none' }}>{subtitle}</Tag>
    </Flex>
    <div style={{ height: 60, width: '100%', marginTop: 10, marginLeft: -20, marginRight: -20 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fillOpacity={1} fill={`url(#grad-${title})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </Card>
);

export const ReceptionistDashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const columns = [
    { title: 'NAME', dataIndex: 'name', key: 'name', render: (t: string) => <Text strong>{t}</Text> },
    { title: 'ID NUMBER', dataIndex: 'idNum', key: 'idNum', render: (t: string) => <Text type="secondary">{t}</Text> },
    { title: 'ADMISSION DATE', dataIndex: 'date', key: 'date' },
    { title: 'DIAGNOSE', dataIndex: 'diagnose', key: 'diagnose' },
    { 
      title: 'STATUS', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => {
        let color = status === 'Urgent' ? 'error' : status === 'Moderate' ? 'warning' : 'success';
        return <Tag color={color} style={{ borderRadius: 12, padding: '2px 10px', fontWeight: 600 }}>{status}</Tag>;
      }
    }
  ];

  return (
    <ConfigProvider theme={themeConfig}>
      <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: themeConfig.token.colorBgLayout }}>
        
        {/* ROW 1: Summary Stats[cite: 1] */}
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <SparklineCard title="Total Beds" value="60" subtitle="• Available 24" data={sparklineData1} color="#0EA5E9" />
          </Col>
          <Col xs={24} md={8}>
            <SparklineCard title="Doctors" value="46" subtitle="• Available 12" data={sparklineData2} color="#8B5CF6" />
          </Col>
          <Col xs={24} md={8}>
            <SparklineCard title="Patients" value="212" subtitle="• New Today 18" data={sparklineData3} color="#10B981" />
          </Col>
        </Row>

        {/* ROW 2: Report & Patients Overview[cite: 1] */}
        <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
          <Col xs={24} lg={8}>
            <Card bordered={false} style={{ height: '100%', boxShadow: themeConfig.token.boxShadowTertiary }}>
              <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                <Title level={5} style={{ margin: 0 }}>Report</Title>
                <Button type="primary" size="small" icon={<Plus size={14}/>} style={{ borderRadius: 6 }}>Add Report</Button>
              </Flex>
              <Flex align="center" justify="center" gap={32} style={{ height: 200 }}>
                <div style={{ position: 'relative', width: 140, height: 140 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={reportData} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                        {reportData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Total Done</Text>
                    <Title level={4} style={{ margin: 0 }}>75%</Title>
                  </div>
                </div>
                <Flex vertical gap={12}>
                  {reportData.map(item => (
                    <Flex key={item.name} align="center" justify="space-between" style={{ width: 100 }}>
                      <Flex align="center" gap={8}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color }} />
                        <Text type="secondary">{item.name}</Text>
                      </Flex>
                      <Text strong>{item.value}%</Text>
                    </Flex>
                  ))}
                </Flex>
              </Flex>
            </Card>
          </Col>

          <Col xs={24} lg={16}>
            <Card bordered={false} style={{ height: '100%', boxShadow: themeConfig.token.boxShadowTertiary }}>
              <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                <Title level={5} style={{ margin: 0 }}>Patients Overview</Title>
                <Button type="text" icon={<MoreVertical size={16} />} />
              </Flex>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={patientOverviewData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDischarge" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="new" stroke="#0EA5E9" fillOpacity={1} fill="url(#colorNew)" name="New" />
                    <Area type="monotone" dataKey="discharge" stroke="#10B981" fillOpacity={1} fill="url(#colorDischarge)" name="Discharge" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
        </Row>

        {/* ROW 3: Success Stats & Doctors List[cite: 1] */}
        <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
          <Col xs={24} lg={12}>
            <Card bordered={false} style={{ height: '100%', boxShadow: themeConfig.token.boxShadowTertiary }}>
              <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
                <Title level={5} style={{ margin: 0 }}>Success Stats</Title>
                <Tag color="blue" style={{ borderRadius: 12, border: 'none' }}>• This Week</Tag>
              </Flex>
              <Flex vertical gap={12}>
                {successStats.map((stat) => (
                  <div key={stat.dept}>
                    <Flex justify="space-between" style={{ marginBottom: 4 }}>
                      <Text type="secondary" style={{ fontSize: 13 }}>{stat.dept}</Text>
                      <Text strong style={{ fontSize: 13 }}>{stat.value}%</Text>
                    </Flex>
                    <Progress percent={stat.value} showInfo={false} strokeColor={stat.color} size="small" />
                  </div>
                ))}
              </Flex>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card bordered={false} style={{ height: '100%', boxShadow: themeConfig.token.boxShadowTertiary }}>
              <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                <Title level={5} style={{ margin: 0 }}>Doctors List</Title>
                <Button type="link" size="small">See all</Button>
              </Flex>
              <List
                itemLayout="horizontal"
                dataSource={doctorsList}
                renderItem={(item) => (
                  <List.Item style={{ padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <List.Item.Meta
                      avatar={<Avatar src={item.avatar} size={40} />}
                      title={<Text strong>{item.name}</Text>}
                      description={<Text type="secondary" style={{ fontSize: 13 }}>{item.spec}</Text>}
                    />
                    <Button type="text" icon={<MoreVertical size={16} />} />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        {/* ROW 4: Birth & Death Analytics (Combined with Patient Stats in layout)[cite: 1] */}
        <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
          <Col xs={24} lg={16}>
             <Card bordered={false} style={{ height: '100%', boxShadow: themeConfig.token.boxShadowTertiary }}>
              <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                <Title level={5} style={{ margin: 0 }}>Patient Statistics</Title>
                <Flex gap={8}>
                  <Select defaultValue="week" size="small" style={{ width: 130 }} options={[{value: 'week', label: '12-18 Sept, 2021'}]} />
                  <Tag style={{ cursor: 'pointer' }}>YEAR</Tag>
                  <Tag style={{ cursor: 'pointer' }}>MONTH</Tag>
                  <Tag color="blue" style={{ cursor: 'pointer' }}>WEEK</Tag>
                </Flex>
              </Flex>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={patientOverviewData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorStats" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="new" stroke="#0EA5E9" strokeWidth={3} fillOpacity={1} fill="url(#colorStats)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card bordered={false} style={{ height: '100%', boxShadow: themeConfig.token.boxShadowTertiary }}>
              <Title level={5} style={{ margin: '0 0 24px 0' }}>Hospital Birth & Death Analytics</Title>
              <Flex align="center" justify="center" gap={24} style={{ height: 200 }}>
                <div style={{ position: 'relative', width: 150, height: 150 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={birthDeathData} innerRadius={55} outerRadius={75} paddingAngle={2} dataKey="value" stroke="none">
                        {birthDeathData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <Flex vertical gap={12}>
                  {birthDeathData.map(item => (
                    <Flex key={item.name} align="center" justify="space-between" style={{ width: 120 }}>
                      <Flex align="center" gap={8}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color }} />
                        <Text type="secondary" style={{ fontSize: 13 }}>{item.name}</Text>
                      </Flex>
                      <Text strong style={{ fontSize: 13 }}>{item.value}%</Text>
                    </Flex>
                  ))}
                </Flex>
              </Flex>
            </Card>
          </Col>
        </Row>

        {/* ROW 5: Data Table[cite: 1] */}
        <Card bordered={false} style={{ marginTop: 24, boxShadow: themeConfig.token.boxShadowTertiary }}>
          <Flex justify="space-between" align="center" style={{ marginBottom: 20 }}>
            <div>
              <Title level={5} style={{ margin: 0 }}>Patients Detail Information</Title>
              <Text type="secondary" style={{ fontSize: 13 }}>Live list of patient admissions with status</Text>
            </div>
            <Flex gap={12}>
              <Input prefix={<Search size={16} color="#94A3B8"/>} placeholder="Search..." style={{ width: 200 }} />
              <Button icon={<Filter size={16} />} />
              <Button icon={<CalendarIcon size={16} />} />
              <Button icon={<Download size={16} />} />
              <Button type="primary" icon={<Plus size={16} />}>Add New</Button>
            </Flex>
          </Flex>
          
          <Table 
            columns={columns} 
            dataSource={patientsTableData} 
            pagination={{ pageSize: 5 }}
            style={{ border: `1px solid ${themeConfig.token.colorBorder}`, borderRadius: themeConfig.token.borderRadius }}
          />
        </Card>

      </div>
    </ConfigProvider>
  );
};