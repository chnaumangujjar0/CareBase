import { useEffect, useMemo, useState } from 'react';
import { ConfigProvider, Card, Typography, Button, Space, Badge, Calendar, Flex, Row, Col, Tag, Empty, Spin } from 'antd';
import { 
  Users, 
  Calendar as CalendarIcon, 
  Stethoscope, 
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { getAppointmentStat } from '../../services/api';
import type { AppointmentRecord, AppointmentStats, AppointmentStatus } from '../../types/global.types';

const { Title, Text } = Typography;

const statusColors: Record<AppointmentStatus, string> = {
  booked: '#0284C7',
  completed: '#16A34A',
  cancelled: '#DC2626',
  no_show: '#D97706',
};

const emptyAppointments: AppointmentRecord[] = [];

export const DoctorDashboard = () => {
  const [currentDate, setCurrentDate] = useState(() => dayjs());
  const currentMonth = currentDate.format('YYYY-MM');
  const [dashboard, setDashboard] = useState<{
    month: string;
    stats: AppointmentStats | null;
    loading: boolean;
  }>(() => ({ month: currentMonth, stats: null, loading: true }));
  const loading = dashboard.month !== currentMonth || dashboard.loading;
  const stats = dashboard.month === currentMonth ? dashboard.stats : null;

  useEffect(() => {
    let active = true;
    const month = dayjs(currentMonth);

    getAppointmentStat({
      from: month.startOf('month').toISOString(),
      to: month.endOf('month').toISOString(),
    })
      .then((result) => {
        if (active) setDashboard({ month: currentMonth, stats: result, loading: false });
      })
      .catch(() => {
        if (!active) return;
        setDashboard({ month: currentMonth, stats: null, loading: false });
        toast.error('Could not load your appointment statistics');
      });

    return () => {
      active = false;
    };
  }, [currentMonth]);

  const appointments = stats?.appointments ?? emptyAppointments;
  const appointmentsByDate = useMemo(() => {
    const grouped = new Map<string, AppointmentRecord[]>();
    appointments.forEach((appointment) => {
      const date = dayjs(appointment.scheduledAt).format('YYYY-MM-DD');
      grouped.set(date, [...(grouped.get(date) ?? []), appointment]);
    });
    return grouped;
  }, [appointments]);
  const selectedDayAppointments = appointmentsByDate.get(currentDate.format('YYYY-MM-DD')) ?? [];
  const todayCount = appointments.filter((appointment) =>
    dayjs(appointment.scheduledAt).isSame(dayjs(), 'day'),
  ).length;
  const weeklyAppointmentData = Array.from(
    { length: Math.ceil(currentDate.daysInMonth() / 7) },
    (_, index) => ({
      name: `Week ${index + 1}`,
      appointments: appointments.filter(
        (appointment) => Math.floor((dayjs(appointment.scheduledAt).date() - 1) / 7) === index,
      ).length,
    }),
  );

  // --- Theme Configuration (Replacing SCSS variables) ---
  const themeConfig = {
    token: {
      colorPrimary: '#0F766E', // Deep Teal
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
    components: {
      Card: {
        paddingLG: 20,
      },
    },
  };

  const kpis = [
    {
      title: 'Patients This Month',
      value: stats?.counts.uniquePatients ?? 0,
      icon: <Users size={24} />,
      color: themeConfig.token.colorInfo,
      bg: 'rgba(2, 132, 199, 0.1)'
    },
    {
      title: "Today's Appointments",
      value: todayCount,
      icon: <CalendarIcon size={24} />,
      color: themeConfig.token.colorSuccess,
      bg: 'rgba(22, 163, 74, 0.1)'
    },
    {
      title: 'Pending Consultations',
      value: stats?.counts.booked ?? 0,
      icon: <Stethoscope size={24} />,
      color: themeConfig.token.colorPrimary,
      bg: 'rgba(15, 118, 110, 0.1)'
    },
    {
      title: 'Completed Consultations',
      value: stats?.counts.completed ?? 0,
      icon: <Activity size={24} />,
      color: themeConfig.token.colorSuccess,
      bg: 'rgba(22, 163, 74, 0.1)'
    }
  ];

  const dateCellRender = (value: Dayjs) => {
    const dayAppointments = appointmentsByDate.get(value.format('YYYY-MM-DD')) ?? [];
    if (dayAppointments.length === 0) return null;

    return (
      <Flex vertical gap={4} style={{ marginTop: 8 }}>
        {dayAppointments.slice(0, 2).map((appointment) => (
          <div
            key={appointment.id}
            title={`${dayjs(appointment.scheduledAt).format('h:mm A')} ${appointment.Patient.firstName} ${appointment.Patient.lastName}`}
            style={{
              background: statusColors[appointment.status],
              color: '#fff',
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 4,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {dayjs(appointment.scheduledAt).format('h:mm A')} {appointment.Patient.firstName} {appointment.Patient.lastName}
          </div>
        ))}
        {dayAppointments.length > 2 && (
          <Text type="secondary" style={{ fontSize: 11 }}>+{dayAppointments.length - 2} more</Text>
        )}
      </Flex>
    );
  };

  return (
    <ConfigProvider theme={themeConfig}>
      <div style={{ minHeight: '100vh', padding: 24, backgroundColor: themeConfig.token.colorBgLayout }}>
        
        {/* KPI Row */}
        <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
          {kpis.map((kpi, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card bordered={false} style={{ boxShadow: themeConfig.token.boxShadowTertiary, height: '100%' }}>
                <Flex justify="space-between" align="flex-start">
                  <Flex vertical>
                    <Text type="secondary" style={{ fontWeight: 500 }}>{kpi.title}</Text>
                    <Title level={3} style={{ margin: '8px 0' }}>{kpi.value}</Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>{currentDate.format('MMMM YYYY')}</Text>
                  </Flex>
                  <Flex align="center" justify="center" style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: kpi.bg, color: kpi.color }}>
                    {kpi.icon}
                  </Flex>
                </Flex>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Main Layout Grid */}
        <Row gutter={[24, 24]}>
          
          {/* Left Side: Calendar */}
          <Col xs={24} lg={17}>
            <Card 
              bordered={false} 
              style={{ boxShadow: themeConfig.token.boxShadowTertiary, overflow: 'hidden' }}
              bodyStyle={{ padding: 0 }}
            >
              {/* Custom Calendar Header */}
              <Flex justify="space-between" align="center" style={{ padding: 24, borderBottom: '1px solid #E2E8F0' }}>
                <Space>
                  <Button icon={<ChevronLeft size={18} />} onClick={() => setCurrentDate(currentDate.subtract(1, 'month').startOf('month'))} />
                  <Button icon={<ChevronRight size={18} />} onClick={() => setCurrentDate(currentDate.add(1, 'month').startOf('month'))} />
                  <Button onClick={() => setCurrentDate(dayjs())}>Today</Button>
                </Space>
                <Title level={4} style={{ margin: 0, color: themeConfig.token.colorPrimary }}>
                  {currentDate.format('MMMM YYYY')}
                </Title>
                <Space>
                  <Button type="primary">Month</Button>
                  <Button>Week</Button>
                  <Button>Day</Button>
                </Space>
              </Flex>

              <Calendar 
                value={currentDate} 
                onChange={setCurrentDate}
                headerRender={() => null} // Hide default header to use our custom one above
                cellRender={dateCellRender}
                style={{ padding: '0 12px 12px 12px' }}
              />
            </Card>
          </Col>

          {/* Right Side: Sidebar Panels */}
          <Col xs={24} lg={7}>
            <Flex vertical gap={24} style={{ height: '100%' }}>
              
              {/* Today's Appointments */}
              <Card bordered={false} style={{ boxShadow: themeConfig.token.boxShadowTertiary, flex: 1 }}>
                <Flex align="center" gap={8} style={{ marginBottom: 24 }}>
                  <Badge color={themeConfig.token.colorSuccess} />
                  <Title level={5} style={{ margin: 0 }}>Appointments on {currentDate.format('MMM D')}</Title>
                </Flex>
                <Spin spinning={loading}>
                  {selectedDayAppointments.length ? (
                    <Flex vertical gap={12} style={{ maxHeight: 220, overflowY: 'auto' }}>
                      {selectedDayAppointments.map((appointment) => (
                        <Flex key={appointment.id} justify="space-between" align="center" gap={12}>
                          <Flex vertical style={{ minWidth: 0 }}>
                            <Text strong ellipsis>{appointment.Patient.firstName} {appointment.Patient.lastName}</Text>
                            <Text type="secondary">{dayjs(appointment.scheduledAt).format('h:mm A')} · {appointment.Department.name}</Text>
                          </Flex>
                          <Tag color={statusColors[appointment.status]}>{appointment.status.replace('_', ' ')}</Tag>
                        </Flex>
                      ))}
                    </Flex>
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No appointments on this day" />
                  )}
                </Spin>
              </Card>

              {/* Recharts Analytics Panel */}
              <Card bordered={false} style={{ boxShadow: themeConfig.token.boxShadowTertiary, flex: 1 }}>
                <Flex align="center" gap={8} style={{ marginBottom: 24 }}>
                  <Activity size={18} color={themeConfig.token.colorPrimary} />
                  <Title level={5} style={{ margin: 0 }}>Appointment Overview</Title>
                </Flex>
                <div style={{ height: 160, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyAppointmentData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={themeConfig.token.colorPrimary} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={themeConfig.token.colorPrimary} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Tooltip 
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: themeConfig.token.boxShadowTertiary }}
                        itemStyle={{ color: themeConfig.token.colorPrimary, fontWeight: 600 }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="appointments" 
                        stroke={themeConfig.token.colorPrimary} 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

            </Flex>
          </Col>
        </Row>

        {/* Minimal inline style to fix Ant Design Calendar cell spacing to match custom UI */}
        <style>{`
          .ant-picker-calendar-date {
            min-height: 100px !important;
          }
        `}</style>

      </div>
    </ConfigProvider>
  );
};