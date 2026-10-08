import React, { useEffect, useState } from "react";
import { 
  ConfigProvider, 
  Card, 
  Form, 
  Input, 
  Button, 
  Select, 
  Row, 
  Col, 
  Typography, 
  Upload, 
  Flex, 
  message, 
  Tag
} from "antd";
import { 
  UploadCloud, 
  Save, 
  Image as ImageIcon,
  Clock 
} from "lucide-react";
import { useDispatch } from "react-redux";
import { isAxiosError } from "axios";
import { setTenant } from "../../store/tenantSlice";
import { useTenantBootstrap } from "../../store/Usetenantbootstrap";
import type { AppDispatch } from "../../store/store";
import { updateTenantDetails } from "../../services/api";
import dayjs from "dayjs";
import { toast } from "react-toastify";

const { Title, Text } = Typography;
const { Dragger } = Upload;

export const HospitalProfile: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { tenant } = useTenantBootstrap();
  const [form] = Form.useForm();
  
  const [isLoading, setIsLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | undefined>(tenant?.logo);
  const [faviconPreview, setFaviconPreview] = useState<string | undefined>(tenant?.favicon);

  // --- Theme Configuration using our enterprise variables ---
  const themeConfig = {
    token: {
      colorPrimary: '#0F766E', // Deep Teal
      colorSuccess: '#16A34A', // Green
      colorInfo: '#0284C7',    // Blue
      colorError: '#DC2626',
      colorTextBase: '#1E293B',
      colorBgLayout: '#F1F5F9',
      colorBorder: '#E2E8F0',
      borderRadius: 8,
      fontFamily: '"Inter", sans-serif',
      boxShadowTertiary: '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.06)',
    },
  };

  // Populate form when tenant data is available
  useEffect(() => {
    if (tenant) {
      form.setFieldsValue({
        tenantName: tenant.name,
        address: tenant.address,
        city: tenant.city,
        state: tenant.state,
        country: tenant.country || "PK",
        postalCode: tenant.postalCode,
      });
      setLogoPreview(tenant.logo);
      setFaviconPreview(tenant.favicon);
    }
  }, [tenant, form]);

  const handleFileChange = (file: File, type: "logo" | "favicon") => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('You can only upload image files!');
      return false;
    }
    
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Image must be smaller than 5MB!');
      return false;
    }

    const previewUrl = URL.createObjectURL(file);
    if (type === "logo") {
      setLogoFile(file);
      setLogoPreview(previewUrl);
    } else {
      setFaviconFile(file);
      setFaviconPreview(previewUrl);
    }
    return false; // Prevent automatic upload by Antd
  };

  const onFinish = async (values: {
    tenantName: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  }) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", values.tenantName);
      if (values.address !== undefined) formData.append("address", values.address);
      if (values.city !== undefined) formData.append("city", values.city);
      if (values.state !== undefined) formData.append("state", values.state);
      if (values.country !== undefined) formData.append("country", values.country);
      if (values.postalCode !== undefined) formData.append("postalCode", values.postalCode);
      if (logoFile) formData.append("logo", logoFile);
      if (faviconFile) formData.append("favicon", faviconFile);

      const updatedTenant = await updateTenantDetails(formData);
      dispatch(setTenant(updatedTenant));
      setLogoFile(null);
      setFaviconFile(null);
      toast.success("Hospital profile updated successfully!");
    } catch (error: unknown) {
      const errorMessage = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ?? error.message
        : error instanceof Error
          ? error.message
          : "Failed to update profile. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Custom Card Title Component matching the reference image typography
  const SectionTitle = ({ title }: { title: string }) => (
    <Text style={{ 
      fontSize: 13, 
      fontWeight: 700, 
      letterSpacing: '0.05em', 
      textTransform: 'uppercase',
      color: themeConfig.token.colorTextBase 
    }}>
      {title}
    </Text>
  );

  return (
    <ConfigProvider theme={themeConfig}>
      <div style={{ padding: 24, minHeight: '100vh', backgroundColor: themeConfig.token.colorBgLayout }}>
        <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
          <div>
            <Title level={3} style={{ margin: 0, fontWeight: 600 }}>Hospital Profile</Title>
            <Text type="secondary">Manage your workspace identity and location details.</Text>
          </div>
        </Flex>

        <Form 
          form={form} 
          layout="vertical" 
          onFinish={onFinish}
          requiredMark="optional"
        >
          <Row gutter={[24, 24]}>
            {/* Left Column: Form Fields */}
            <Col xs={24} lg={16}>
              <Flex vertical gap={24}>
                
                {/* ESSENTIAL HOSPITAL INFORMATION */}
                <Card 
                  bordered={false} 
                  style={{ boxShadow: themeConfig.token.boxShadowTertiary }}
                  title={<SectionTitle title="Essential Hospital Information" />}
                  extra={
                    <Tag style={{ border: 'none', background: 'rgba(2, 132, 199, 0.1)', color: themeConfig.token.colorInfo, fontWeight: 500, borderRadius: 12 }}>
                      • Updated: {dayjs().format('MMM YYYY')}
                    </Tag>
                  }
                >
                  {/* Wide Logo Upload Area */}
                  <Form.Item style={{ marginBottom: 24 }}>
                    <Dragger
                      name="logo"
                      showUploadList={false}
                      beforeUpload={(file) => handleFileChange(file as File, "logo")}
                      disabled={isLoading}
                      style={{ padding: '32px 0', background: 'rgba(15, 118, 110, 0.02)', borderColor: themeConfig.token.colorBorder }}
                    >
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" style={{ maxHeight: 120, objectFit: 'contain' }} />
                      ) : (
                        <Flex vertical align="center" gap={8} style={{ color: themeConfig.token.colorPrimary }}>
                          <UploadCloud size={32} />
                          <Text strong style={{ marginTop: 8 }}>Upload Hospital Logo</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>PNG, JPG up to 5MB</Text>
                        </Flex>
                      )}
                    </Dragger>
                  </Form.Item>

                  <Row gutter={24}>
                    <Col xs={24} md={16}>
                      <Form.Item 
                        name="tenantName" 
                        label={<Text strong>Hospital Name <span style={{ color: themeConfig.token.colorError }}>*</span></Text>}
                        rules={[{ required: true, message: "Hospital name is required" }]}
                      >
                        <Input size="large" placeholder="e.g. City General Hospital" disabled={isLoading} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item label={<Text strong>Favicon <span style={{ color: themeConfig.token.colorError }}>*</span></Text>}>
                        <Upload
                          name="favicon"
                          listType="picture-card"
                          showUploadList={false}
                          beforeUpload={(file) => handleFileChange(file as File, "favicon")}
                          disabled={isLoading}
                          style={{ width: '100%' }}
                        >
                          {faviconPreview ? (
                            <img src={faviconPreview} alt="Favicon" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                          ) : (
                            <Flex vertical align="center" gap={8} style={{ color: '#64748b' }}>
                              <ImageIcon size={20} />
                              <div style={{ fontSize: 12 }}>Upload Icon</div>
                            </Flex>
                          )}
                        </Upload>
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>

                {/* LOCATION DETAILS */}
                <Card 
                  bordered={false} 
                  style={{ boxShadow: themeConfig.token.boxShadowTertiary }}
                  title={<SectionTitle title="Location Details" />}
                >
                  <Form.Item name="address" label={<Text type="secondary">Street Address</Text>}>
                    <Input size="large" placeholder="123 Medical Boulevard" disabled={isLoading} />
                  </Form.Item>

                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="city" label={<Text type="secondary">City</Text>}>
                        <Input size="large" disabled={isLoading} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="state" label={<Text type="secondary">State / Province</Text>}>
                        <Input size="large" disabled={isLoading} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item 
                        name="country" 
                        label={<Text type="secondary">Country</Text>}
                        rules={[{ required: true, message: "Country is required" }]}
                      >
                        <Select size="large" disabled={isLoading}>
                          <Select.Option value="PK">Pakistan (PK)</Select.Option>
                          <Select.Option value="US">United States (US)</Select.Option>
                          <Select.Option value="UK">United Kingdom (UK)</Select.Option>
                          <Select.Option value="AE">United Arab Emirates (AE)</Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="postalCode" label={<Text type="secondary">Postal Code</Text>}>
                        <Input size="large" disabled={isLoading} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    size="large" 
                    icon={<Save size={18} />} 
                    loading={isLoading}
                    style={{ width: '100%', fontWeight: 600 }}
                  >
                    Save Profile Changes
                  </Button>
                </Card>
                
              </Flex>
            </Col>

            {/* Right Column: Status Cards & Actions */}
            <Col xs={24} lg={8}>
              <Flex vertical gap={24} style={{ position: 'sticky', top: 24 }}>
                
                {/* Active Since Component */}
                <Card bordered={false} style={{ boxShadow: themeConfig.token.boxShadowTertiary }}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Active Since
                  </Text>
                  <Title level={3} style={{ margin: '4px 0 0 0' }}>
                    {tenant?.createdAt ? dayjs(tenant.createdAt).format('DD MMM, YYYY') : '15 JAN, 2012'}
                  </Title>
                </Card>

                {/* Operation Hours Component */}
                <Card bordered={false} style={{ boxShadow: themeConfig.token.boxShadowTertiary }}>
                  <Flex align="center" gap={8} style={{ marginBottom: 16 }}>
                    <Clock size={16} color={themeConfig.token.colorPrimary} />
                    <Text style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', color: themeConfig.token.colorTextBase }}>
                      OPERATION HOURS
                    </Text>
                  </Flex>
                  <Flex 
                    justify="space-between" 
                    align="center" 
                    style={{ 
                      background: 'rgba(15, 23, 42, 0.02)', 
                      padding: '12px 16px', 
                      borderRadius: 8, 
                      border: `1px solid ${themeConfig.token.colorBorder}` 
                    }}
                  >
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.05em' }}>
                      EMERGENCY
                    </Text>
                    <Tag color="success" style={{ margin: 0, borderRadius: 12, padding: '2px 10px', fontWeight: 600 }}>
                       <span style={{ fontSize: 10, marginRight: 4 }}>●</span> 24 / 7
                    </Tag>
                  </Flex>
                </Card>

                {/* Save Action Card */}

              </Flex>
            </Col>
          </Row>
        </Form>
      </div>
    </ConfigProvider>
  );
};