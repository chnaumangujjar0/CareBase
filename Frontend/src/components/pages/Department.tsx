import { useState } from 'react';
import { Container, Row, Col, Card, Button, Badge, Modal, Form } from 'react-bootstrap';
import { Pencil, Trash, Plus } from 'lucide-react';
import { useFormik } from 'formik';

// Define the shape of our form values
interface DepartmentFormValues {
  name: string;
  isActive: boolean;
}

// Mock Data based on your DB model
const initialDepartments = [
  { id: 'd3b0c4a1-8e4b-4f1a-b9c2-3d4e5f6a7b8c', name: 'Endocrinology', isActive: true },
  { id: 'f1c2d3e4-5f6a-7b8c-9d0e-1f2a3b4c5d6e', name: 'Emergency', isActive: true },
  { id: 'e4a5b6c7-d8e9-f0a1-b2c3-d4e5f6a7b8c9', name: 'Cardiology', isActive: true },
  { id: 'g7h8i9j0-k1l2-m3n4-o5p6-q7r8s9t0u1v2', name: 'Pharmacy', isActive: true },
  { id: 'j9k0l1m2-n3o4-p5q6-r7s8-t9u0v1w2x3y4', name: 'Radiology', isActive: false },
];

export default function Departments() {
  const [departments, setDepartments] = useState(initialDepartments);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const formik = useFormik<DepartmentFormValues>({
    initialValues: {
      name: '',
      isActive: true,
    },
    validate: (values) => {
      const errors: Partial<DepartmentFormValues> = {};
      if (!values.name || values.name.trim().length < 2) {
        errors.name = 'Department name is required (min 2 characters)';
      }
      return errors;
    },
    onSubmit: (values) => {
      if (editingId) {
        // Update existing department
        setDepartments(departments.map(d => 
          d.id === editingId ? { ...d, ...values } : d
        ));
      } else {
        // Create new department
        const newDept = {
          id: crypto.randomUUID(),
          ...values
        };
        setDepartments([...departments, newDept]);
      }
      handleClose();
    },
  });

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    formik.resetForm(); // Resets values and errors to initial state
  };

  const handleShow = () => setShowModal(true);

  const handleEdit = (dept: typeof initialDepartments[0]) => {
    setEditingId(dept.id);
    // Populate Formik with the selected department's data
    formik.setValues({
      name: dept.name,
      isActive: dept.isActive
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      setDepartments(departments.filter(d => d.id !== id));
    }
  };

  return (
    <Container fluid className="p-4 body-bg min-vh-100">
      {/* Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold text-dark mb-0">Departments</h3>
        <Button variant="primary" onClick={handleShow} className="d-flex align-items-center gap-2">
          <Plus size={20} /> Add Department
        </Button>
      </div>

      {/* Grid Layout: 1 col on mobile, 2 on tablet, 3 on desktop */}
      <Row xs={1} md={2} lg={3} className="g-4">
        {departments.map((dept) => (
          <Col key={dept.id}>
            <Card className="h-100 shadow-sm border-0 department-card bg-light">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h5 className="fw-bold mb-0 text-truncate pe-2" title={dept.name}>
                    {dept.name}
                  </h5>
                  <Badge 
                    bg={dept.isActive ? 'success' : 'secondary'} 
                    className={dept.isActive ? 'bg-opacity-25 text-success' : 'bg-opacity-25 text-secondary'}
                  >
                    {dept.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {/* Truncated UUID to keep UI clean */}
                <p className="text-muted small font-monospace mb-0 truncate-single" title={dept.id}>
                  {dept.id}
                </p>
              </Card.Body>
              <Card.Footer className="bg-transparent border-top border-light d-flex justify-content-between align-items-center py-3">
                <span className="text-muted small">Updated recently</span>
                <div className="d-flex gap-2">
                  <Button variant="outline-secondary" size="sm" onClick={() => handleEdit(dept)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="outline-danger" size="sm" onClick={() => handleDelete(dept.id)}>
                    <Trash size={14} />
                  </Button>
                </div>
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={handleClose} centered backdrop="static">
        <Form onSubmit={formik.handleSubmit}>
          <Modal.Header closeButton className="border-bottom-0">
            <Modal.Title className="fw-bold h5">
              {editingId ? 'Edit Department' : 'New Department'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-secondary">Department Name</Form.Label>
              <Form.Control 
                type="text" 
                name="name"
                placeholder="e.g., Cardiology" 
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                isInvalid={formik.touched.name && !!formik.errors.name}
              />
              <Form.Control.Feedback type="invalid">
                {formik.errors.name}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Check 
                type="switch"
                id="active-switch"
                name="isActive"
                label="Set as Active Department"
                checked={formik.values.isActive}
                onChange={formik.handleChange}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-top-0">
            <Button variant="outline-secondary" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={formik.isSubmitting}>
              {editingId ? 'Save Changes' : 'Create Department'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}