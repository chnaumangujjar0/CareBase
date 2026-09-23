import { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Badge, Modal, Form, ToastContainer } from 'react-bootstrap';
import { Pencil, Trash, Plus } from 'lucide-react';
import { useFormik } from 'formik';
import { addDepartment, deleteDepartment, getDepartments, updateDepartment } from '../../services/api';
import { toast } from 'react-toastify';
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../../store/authSlice";
import type { AuthUser } from '../../types/auth';
// Define the shape of our form values
interface DepartmentFormValues {
  name: string;
  isActive: boolean;
}

interface Department {
  id: string;
  name: string;
  isActive: boolean;
}


export default function Departments() {
  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<string | null>(null);
  const user =useSelector(selectCurrentUser) as AuthUser

  useEffect(() => {
    getDepartments(user.tenantId as string)
    .then((res) => {
      console.log(res);
      setDepartments(res)})
    .catch((err:Error) => toast.error(err.message))
  },[])


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
    onSubmit: async (values) => {
      if (editingId) {
        let payload:any = {}
        departments?.map((dept) => {
          if(dept.id === editingId){
            if(dept.name !== values.name.trim()){
              payload.name = values.name
              if(dept.isActive !== values.isActive){
                payload.isActive = values.isActive
              }
            }
          }
        })
        try {
          await updateDepartment(user.tenantId as string, editingId,payload)
          setDepartments((currentDepartments) =>
            (currentDepartments ?? []).map((dep) =>
              dep.id === editingId
                ? { ...dep, name: values.name, isActive: values.isActive }
                : dep
            )
          )
          handleClose()
          toast.success("Department Updated Syccessfully!")
        } catch (error) {
          if(error instanceof Error){
            toast.error(error.message)
          }
        } 
      } else {
        try {
          const res = await addDepartment(values,user.tenantId as string)
          setDepartments((currentDepartments) => [...(currentDepartments ?? []), res]);
          handleClose();
          toast.success("Department created Successfully!")
        } catch (error) {
          
          if(error instanceof Error){
            toast.error(error.message)
          }
        }
      }
    },
  });

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    formik.resetForm(); 
  };

  const handleShow = () => setShowModal(true);

  const handleEdit = (dept: Department) => {
    setEditingId(dept.id);
     formik.setValues({
      name: dept.name,
      isActive: dept.isActive
    });
    setShowModal(true);
  };

  const handleDeleteClick = async (id: string) => {
    setDepartmentToDelete(id);
    setShowDeleteModal(true);
    
  };

  const confirmDelete = async () => {
    try {
      await deleteDepartment(user?.tenantId as string, departmentToDelete as string)
      setDepartments((currentDepartments) =>
        (currentDepartments ?? []).filter((d) => d.id !== departmentToDelete)
      );
      setShowDeleteModal(false);
      setDepartmentToDelete(null);
    } catch (error) {
      if(error instanceof Error){
            toast.error(error.message)
          }
    }
  }

  const handleCloseDelete = () => {
    setShowDeleteModal(false);
    setDepartmentToDelete(null);
  };

  return (
    <>
    <ToastContainer position='bottom-center'></ToastContainer>
    <Container fluid className="p-4 body-bg min-vh-100">
      {/* Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold text-dark mb-0">Departments</h3>
        <Button variant="primary" onClick={handleShow} className="d-flex align-items-center gap-2">
          <Plus size={20} /> Add Department
        </Button>
      </div>
      {!departments && (
            <Card className="h-100 shadow-lg border-0 department-card bg-light w-full">
              <Card.Body>
                  <div className="d-flex justify-content-center align-items-center p-4">
                    <h1 className="fw-bold mb-0 text-truncate pe-2" >
                      No Department Added yet.
                    </h1>
                  </div>
              </Card.Body>
            </Card>
          )
        }
      {/* Grid Layout: 1 col on mobile, 2 on tablet, 3 on desktop */}
      <Row xs={1} md={2} lg={3} className="g-4">
        
      {departments && departments.length > 0 && (
          departments.map((dept:any) => (
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
                    <Button variant="outline-danger" size="sm" onClick={() => handleDeleteClick(dept.id)}>
                      <Trash size={14} />
                    </Button>
                  </div>
                </Card.Footer>
              </Card>
            </Col>
          ))
        )
      }
          
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

       {/* delete Modal */}
      <Modal show={showDeleteModal} onHide={handleCloseDelete} centered backdrop="static">
        <Modal.Header closeButton className="border-bottom-0">
          <Modal.Title className="fw-bold h5 text-danger">
            Confirm Deletion
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-secondary">
          Are you sure you want to delete this department? This action cannot be undone and may affect associated staff or records.
        </Modal.Body>
        <Modal.Footer className="border-top-0">
          <Button variant="outline-secondary" onClick={handleCloseDelete}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete Department
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
    </>
  );
}