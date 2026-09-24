import { useState } from 'react';
import { Container, Row, Col, Card, Badge } from 'react-bootstrap';
import { Modal, Input, Select, Switch, DatePicker, Button, ConfigProvider } from 'antd';
import { Search, Calendar, Plus, Mail, Phone } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import dayjs from 'dayjs';

const { TextArea } = Input;

// 1. Dynamic Validation Schema
const profileSchema = Yup.object().shape({
  type: Yup.string().oneOf(["Doctor", "Staff"]).required("Staff Type is required"),
  userId: Yup.string().required("Linked User Account is required"),
  employeeId: Yup.string().required("Employee ID is required"),
  departmentId: Yup.string().required("Department is required"),
  phone: Yup.string().required("Phone number is required"),
  isActive: Yup.boolean(),

  specialization: Yup.string().when('type', {
    is: 'Doctor',
    then: (schema) => schema.required("Specialization is required"),
    otherwise: (schema) => schema.notRequired(),
  }),
  licenseNumber: Yup.string().when('type', {
    is: 'Doctor',
    then: (schema) => schema.required("License Number is required"),
    otherwise: (schema) => schema.notRequired(),
  }),
  qualifications: Yup.string(),
  description: Yup.string(),
  designation: Yup.string(),
  wardId: Yup.string(),
  shift: Yup.string(),
  joiningDate: Yup.string().nullable(),
});

const initialStaff = [
  { id: '1', name: 'Dr. Sarah Turner', role: 'Chief Medical Officer', type: 'Doctor', email: 'dr.turner@gmail.com', phone: '(123) 456-7890', bio: 'Dr. Turner leads our medical team and specializes in internal medicine. She has been serving our patients with compassion and expertise for over 15 years.', image: 'https://i.pravatar.cc/150?u=1' },
  { id: '2', name: 'Dr. Michael Martin', role: 'Head of Surgery', type: 'Doctor', email: 'michaelmartin@gmail.com', phone: '(123) 456-7890', bio: 'Dr. Michael Martin is a renowned surgeon with a reputation for precision and patient-focused care.', image: 'https://i.pravatar.cc/150?u=2' },
  { id: '3', name: 'Dr. Emily Adams, RN', role: 'Head Nurse', type: 'Doctor', email: 'emily.adams@gmail.com', phone: '(555) 123-4567', bio: 'Emily Adams is a dedicated registered nurse with a passion for patient care.', image: 'https://i.pravatar.cc/150?u=3' },
  { id: '4', name: 'James Wilson', role: 'Billing and Finance Manager', type: 'Staff', email: 'dr.james@gmail.com', phone: '(123) 456-7890', bio: 'James Wilson expertly manages billing, insurance claims, and financial planning.', image: 'https://i.pravatar.cc/150?u=4' },
  { id: '5', name: 'Dr. Robert Johnson', role: 'Pediatrics', type: 'Doctor', email: 'dr.robert.johnson@gmail.com', phone: '(444) 333-2222', bio: 'Dr. Robert Johnson is our pediatric specialist, dedicated to the health of our youngest patients.', image: 'https://i.pravatar.cc/150?u=5' },
  { id: '6', name: 'Linda Martinez', role: 'Front Desk Manager', type: 'Staff', email: 'dr.lindamartinez@gmail.com', phone: '(123) 456-7890', bio: 'Linda Martinez oversees the seamless operation of our front desk.', image: 'https://i.pravatar.cc/150?u=6' },
];
 
export default function Staff() {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [staffList, setStaffList] = useState(initialStaff);
  const [activeStaff, setActiveStaff] = useState(initialStaff[0]);
  // 2. Formik Initialization
  const formik = useFormik({
    initialValues: {
      type: 'Doctor',
      userId: '',
      employeeId: '',
      departmentId: '',
      phone: '',
      isActive: true,
      specialization: '',
      qualifications: '',
      licenseNumber: '',
      description: '',
      designation: '',
      wardId: '',
      shift: '',
      joiningDate: null as string | null,
    },
    validationSchema: profileSchema,
    onSubmit: async (values, { resetForm }) => {
      const isDoctor = values.type === 'Doctor';
      const payload = isDoctor 
        ? {
            userId: values.userId,
            employeeId: values.employeeId,
            departmentId: values.departmentId,
            phone: values.phone,
            isActive: values.isActive,
            specialization: values.specialization,
            qualifications: values.qualifications,
            licenseNumber: values.licenseNumber,
            description: values.description,
            designation: values.designation,
          }
        : {
            userId: values.userId,
            employeeId: values.employeeId,
            departmentId: values.departmentId,
            phone: values.phone,
            isActive: values.isActive,
            wardId: values.wardId,
            shift: values.shift,
            joiningDate: values.joiningDate,
          };

      console.log(`Submitting to ${values.type} API:`, payload);
      handleClose();
      resetForm();
    },
  });

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    formik.resetForm();
  };

  const ErrorMessage = ({ name }: { name: keyof typeof formik.values }) => (
    formik.touched[name] && formik.errors[name] ? (
      <div className="text-danger small mt-1">{formik.errors[name] as string}</div>
    ) : null
  );

  return (
    // ConfigProvider allows us to inject our Teal primary color directly into Ant Design
    <ConfigProvider theme={{ token: { colorPrimary: '#0f766e', borderRadius: 6 } }}>
      <Container fluid className="p-4 bg-light min-vh-100 staff-page">
        {/* Header Bar */}
        <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 rounded shadow-sm">
          <h3 className="fw-bold mb-0 me-4">Staff</h3>
          
          <Input 
            prefix={<Search className="text-muted" />} 
            placeholder="Search" 
            className="w-25 me-auto border-0 bg-light"
            size="large"
          />

          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center text-muted bg-light px-3 py-2 rounded border">
              <Calendar size={16} className="me-2" />
              <span className="small">{dayjs().format('dddd, DD MMMM YYYY')}</span>
            </div>
            <Button size="large">Export</Button>
            <Button type="primary" size="large" icon={<Plus />} onClick={() => setShowModal(true)}>
              Add Staff
            </Button>
          </div>
        </div>

        {/* --- Ant Design Modal --- */}
        <Modal
          title={<span className="fw-bold h5 text-navy">{editingId ? 'Edit Profile' : 'Add New Profile'}</span>}
          open={showModal}
          onCancel={handleClose}
          width={800}
          centered
          footer={[
            <Button key="back" onClick={handleClose}>Cancel</Button>,
            <Button key="submit" type="primary" loading={formik.isSubmitting} onClick={() => formik.handleSubmit()}>
              {editingId ? 'Save Profile' : 'Create Profile'}
            </Button>
          ]}
        >
          <div className="pt-3">
            {/* 1. PROFILE TYPE SELECTION */}
            <Row className="mb-4">
              <Col md={12}>
                <label className="small fw-bold text-secondary mb-1">Profile Type</label>
                <Select 
                  className="w-100"
                  size="large"
                  value={formik.values.type}
                  onChange={(val) => formik.setFieldValue('type', val)}
                  options={[
                    { value: 'Doctor', label: 'Medical Doctor' },
                    { value: 'Staff', label: 'Hospital Staff (Nurse, Admin, etc.)' }
                  ]}
                />
              </Col>
            </Row>

            <h6 className="fw-bold text-navy border-bottom pb-2 mb-3">General Information</h6>
            
            {/* 2. COMMON FIELDS */}
            <Row className="g-3 mb-4">
              <Col md={6}>
                <label className="small fw-bold text-secondary mb-1">Linked User Account</label>
                <Select 
                  className="w-100"
                  size="large"
                  placeholder="Select User Account..."
                  value={formik.values.userId || null}
                  onChange={(val) => formik.setFieldValue('userId', val)}
                  onBlur={() => formik.setFieldTouched('userId', true)}
                  status={formik.touched.userId && formik.errors.userId ? 'error' : ''}
                  options={[{ value: 'uuid-123', label: 'John Doe (user@email.com)' }]}
                />
                <ErrorMessage name="userId" />
              </Col>
              
              <Col md={6}>
                <label className="small fw-bold text-secondary mb-1">Employee ID</label>
                <Input 
                  size="large"
                  name="employeeId"
                  placeholder="e.g. EMP-1042"
                  value={formik.values.employeeId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  status={formik.touched.employeeId && formik.errors.employeeId ? 'error' : ''}
                />
                <ErrorMessage name="employeeId" />
              </Col>

              <Col md={6}>
                <label className="small fw-bold text-secondary mb-1">Department</label>
                <Select 
                  className="w-100"
                  size="large"
                  placeholder="Select Department..."
                  value={formik.values.departmentId || null}
                  onChange={(val) => formik.setFieldValue('departmentId', val)}
                  onBlur={() => formik.setFieldTouched('departmentId', true)}
                  status={formik.touched.departmentId && formik.errors.departmentId ? 'error' : ''}
                  options={[
                    { value: 'dept-1', label: 'Cardiology' },
                    { value: 'dept-2', label: 'Front Desk' }
                  ]}
                />
                <ErrorMessage name="departmentId" />
              </Col>

              <Col md={6}>
                <label className="small fw-bold text-secondary mb-1">Phone Number</label>
                <Input 
                  size="large"
                  name="phone"
                  value={formik.values.phone}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  status={formik.touched.phone && formik.errors.phone ? 'error' : ''}
                />
                <ErrorMessage name="phone" />
              </Col>
            </Row>

            {/* 3. DYNAMIC FIELDS */}
            {formik.values.type === 'Doctor' ? (
              <>
                <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">Clinical Credentials</h6>
                <Row className="g-3">
                  <Col md={6}>
                    <label className="small fw-bold text-secondary mb-1">Specialization</label>
                    <Input 
                      size="large"
                      name="specialization"
                      placeholder="e.g. Pediatric Cardiology"
                      value={formik.values.specialization}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      status={formik.touched.specialization && formik.errors.specialization ? 'error' : ''}
                    />
                    <ErrorMessage name="specialization" />
                  </Col>

                  <Col md={6}>
                    <label className="small fw-bold text-secondary mb-1">Medical License Number</label>
                    <Input 
                      size="large"
                      name="licenseNumber"
                      value={formik.values.licenseNumber}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      status={formik.touched.licenseNumber && formik.errors.licenseNumber ? 'error' : ''}
                    />
                    <ErrorMessage name="licenseNumber" />
                  </Col>

                  <Col md={6}>
                    <label className="small fw-bold text-secondary mb-1">Designation / Title</label>
                    <Input 
                      size="large"
                      name="designation"
                      placeholder="e.g. Head of Surgery"
                      value={formik.values.designation}
                      onChange={formik.handleChange}
                    />
                  </Col>

                  <Col md={6}>
                    <label className="small fw-bold text-secondary mb-1">Qualifications</label>
                    <Input 
                      size="large"
                      name="qualifications"
                      placeholder="e.g. MD, FACS"
                      value={formik.values.qualifications}
                      onChange={formik.handleChange}
                    />
                  </Col>

                  <Col md={12}>
                    <label className="small fw-bold text-secondary mb-1">Professional Description</label>
                    <TextArea 
                      rows={3} 
                      name="description"
                      placeholder="Brief clinical biography..."
                      value={formik.values.description}
                      onChange={formik.handleChange}
                    />
                  </Col>
                </Row>
              </>
            ) : (
              <>
                <h6 className="fw-bold text-secondary border-bottom pb-2 mb-3">Staff Assignment Details</h6>
                <Row className="g-3">
                  <Col md={4}>
                    <label className="small fw-bold text-secondary mb-1">Assigned Ward</label>
                    <Select 
                      className="w-100"
                      size="large"
                      placeholder="None"
                      allowClear
                      value={formik.values.wardId || null}
                      onChange={(val) => formik.setFieldValue('wardId', val)}
                      options={[
                        { value: 'ward-1', label: 'ICU' },
                        { value: 'ward-2', label: 'Maternity' }
                      ]}
                    />
                  </Col>
                  
                  <Col md={4}>
                    <label className="small fw-bold text-secondary mb-1">Shift</label>
                    <Select 
                      className="w-100"
                      size="large"
                      placeholder="Select Shift..."
                      allowClear
                      value={formik.values.shift || null}
                      onChange={(val) => formik.setFieldValue('shift', val)}
                      options={[
                        { value: 'Morning', label: 'Morning' },
                        { value: 'Evening', label: 'Evening' },
                        { value: 'Night', label: 'Night' }
                      ]}
                    />
                  </Col>

                  <Col md={4}>
                    <label className="small fw-bold text-secondary mb-1 d-block">Joining Date</label>
                    <DatePicker 
                      className="w-100"
                      size="large"
                      value={formik.values.joiningDate ? dayjs(formik.values.joiningDate) : null}
                      onChange={(dateString) => formik.setFieldValue('joiningDate', dateString)}
                    />
                  </Col>
                </Row>
              </>
            )}

            {/* 4. STATUS TOGGLE */}
            <Row className="mt-4">
              <Col className="d-flex align-items-center gap-2">
                <Switch 
                  checked={formik.values.isActive}
                  onChange={(checked) => formik.setFieldValue('isActive', checked)}
                />
                <span className="fw-medium text-dark">Profile is Active</span>
              </Col>
            </Row>

          </div>
        </Modal>

          <Row className="g-4">
        {/* Left Column: Staff Cards Grid */}
        <Col lg={8}>
          <Row xs={1} md={2} className="g-4">
            {staffList.map((staff) => (
              <Col key={staff.id}>
                <Card 
                  className={`h-100 border-0 shadow-sm staff-card ${activeStaff.id === staff.id ? 'active-card' : ''}`}
                  onClick={() => setActiveStaff(staff)}
                >
                  <Card.Body className="d-flex gap-3">
                    <img src={staff.image} alt={staff.name} className="staff-avatar rounded-3 object-fit-cover" />
                    
                    <div className="d-flex flex-column w-100">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <span className="text-muted small fw-medium">{staff.role}</span>
                        <Badge bg="transparent" className="text-warning border border-warning px-2 rounded-pill fw-normal">
                          {staff.type}
                        </Badge>
                      </div>
                      
                      <h6 className="fw-bold mb-2">{staff.name}</h6>
                      <p className="text-muted small mb-3 truncate-multi">{staff.bio}</p>
                      
                      <div className="mt-auto d-flex justify-content-between align-items-end">
                        <div>
                          <div className="text-muted small d-flex align-items-center mb-1">
                            <Mail size={12} className="me-2" /> {staff.email}
                          </div>
                          <div className="text-muted small d-flex align-items-center">
                            <Phone size={12} className="me-2" /> {staff.phone}
                          </div>
                        </div>
                        <Button 
                          //variant="primary" 
                          //size="sm" 
                          className="btn-teal rounded-pill px-3 shadow-sm"
                          onClick={(e) => setShowModal(true)}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Col>

        {/* Right Column: Active Profile Detail View */}
        <Col lg={4}>
          <Card className="border-0 shadow-sm sticky-top profile-sidebar" style={{ top: '2rem' }}>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start mb-4">
                <h5 className="fw-bold mb-0">Profile Staff</h5>
                <Badge bg="transparent" className="text-warning border border-warning rounded-pill">
                  {activeStaff.type}
                </Badge>
              </div>

              <div className="text-center mb-4">
                <img src={activeStaff.image} alt={activeStaff.name} className="profile-avatar mb-3" />
                <h5 className="fw-bold mb-1">{activeStaff.name}</h5>
                <p className="text-muted small">{activeStaff.role}</p>
              </div>

              <div className="profile-details">
                <div className="mb-3">
                  <span className="d-block small fw-bold text-dark mb-1">Specialization</span>
                  <span className="small text-muted">{activeStaff.role}</span>
                </div>
                <div className="mb-3">
                  <span className="d-block small fw-bold text-dark mb-1">Availability</span>
                  <span className="small text-muted">Monday - Thursday</span>
                </div>
                <div className="mb-3">
                  <span className="d-block small fw-bold text-dark mb-1">Service Hours</span>
                  <span className="small text-muted">09.00 AM - 11.00 AM</span>
                </div>
                <div className="mb-3">
                  <span className="d-block small fw-bold text-dark mb-1">Email</span>
                  <span className="small text-muted">{activeStaff.email}</span>
                </div>
                <div className="mb-3">
                  <span className="d-block small fw-bold text-dark mb-1">Phone</span>
                  <span className="small text-muted">{activeStaff.phone}</span>
                </div>
                <div className="mb-4">
                  <span className="d-block small fw-bold text-dark mb-1">Responsibilities</span>
                  <p className="small text-muted mb-0">{activeStaff.bio}</p>
                </div>
              </div>

              <h6 className="fw-bold mb-3">Presence Staff</h6>
              <div className="presence-matrix">
                {/* {renderPresenceDots()} */}
              </div>
              <div className="d-flex justify-content-between text-muted small mt-2 px-1">
                <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      </Container>
    </ConfigProvider>
  );
}