import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Card, Form, Button, Alert, Spinner, Row, Col, Image } from "react-bootstrap";
import { configureTenat } from "../../services/api";
import { useDispatch } from "react-redux";
import { setUser } from "../../store/authSlice";
import { setTenant } from "../../store/tenantSlice";

const Onboarding = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch()

  const formik = useFormik({
    initialValues: {
      tenantName: "",
      logo: null as File | null,
      favicon: null as File | null,
      address: "",
      city: "",
      state: "",
      country: "PK",
      postalCode: "",
    },
    validationSchema: Yup.object({
      tenantName: Yup.string().required("Hospital name is required"),
      logo: Yup.mixed().required("Please select a hospital logo"),
      favicon: Yup.mixed().required("Please select a favicon"),
      country: Yup.string().required("Country is required"),
    }),
    onSubmit: async (values, { setStatus }) => {
      setIsLoading(true);
      try {
        const formData = new FormData();

        formData.append("tenantName", values.tenantName);

        Object.entries(values).forEach(([key, value]) => {
          if (key === "tenantName" || key === "logo" || key === "favicon") {
            if (key === "tenantName") return;
            if (value instanceof File) {
              formData.append(key, value);
            }
            return;
          }

          if (value !== null && value !== "") {
            formData.append(key, value as string);
          }
        });

        const res = await configureTenat(formData);

        dispatch(setUser(res.user))
        dispatch(setTenant(res.tenant))
        
        navigate("/");
      } catch (err) {
          if(err instanceof Error) {

            setStatus(err.message || "Failed to setup workspace. Please try again.");
          }
      } finally {
        setIsLoading(false);
      }
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: "logo" | "favicon") => {
    const file = e.target.files?.[0];
    if (file) {
      formik.setFieldValue(field, file);
    }
  };

  return (
    <div className="auth-shell d-flex min-vh-100 align-items-center justify-content-center p-4">
      <Card className="border-0 shadow-lg" style={{ width: "100%", maxWidth: "700px", borderRadius: "0.75rem" }}>
        <Card.Body className="p-5">
          <div className="text-center mb-4">
            <h2 className="fw-bold text-dark mb-1">Set Up Your Hospital</h2>
            <p className="text-muted">Configure your CareBase workspace details to get started.</p>
          </div>

          {formik.status && <Alert variant="danger" className="text-center py-2">{formik.status}</Alert>}

          <Form onSubmit={formik.handleSubmit}>
            <Row className="mb-3">
              {/* Name - Now takes full width since Slug is removed */}
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold small">Hospital Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g. City General Hospital"
                    disabled={isLoading}
                    {...formik.getFieldProps("tenantName")}
                    isInvalid={!!(formik.touched.tenantName && formik.errors.tenantName)}
                  />
                  <Form.Control.Feedback type="invalid">{formik.errors.tenantName as string}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              {/* Logo Local File Picker */}
              
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold small">Hospital Logo <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/png, image/jpeg, image/svg+xml"
                    disabled={isLoading}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileChange(e, "logo")}
                    isInvalid={!!(formik.touched.logo && formik.errors.logo)}
                  />
                  {formik.values.logo && (
                    <div className="mt-2 border rounded p-2 bg-light d-inline-block">
                      <Image src={URL.createObjectURL(formik.values.logo)} alt="Logo preview" height="40" className="object-fit-contain" />
                    </div>
                  )}
                  <Form.Control.Feedback type="invalid">{formik.errors.logo as string}</Form.Control.Feedback>
                </Form.Group>
              </Col>

              {/* Favicon Local File Picker */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold small">Favicon <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/png, image/x-icon"
                    disabled={isLoading}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileChange(e, "favicon")}
                    isInvalid={!!(formik.touched.favicon && formik.errors.favicon)}
                  />
                  {formik.values.favicon && (
                    <div className="mt-2 border rounded p-2 bg-light d-inline-block">
                      <Image src={URL.createObjectURL(formik.values.favicon)} alt="Favicon preview" height="32" width="32" className="object-fit-contain" />
                    </div>
                  )}
                  <Form.Control.Feedback type="invalid">{formik.errors.favicon as string}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <span>File size must be less than 5MB.</span>
            </Row>

            <hr className="my-4 text-muted" />
            <h5 className="fw-bold text-dark mb-3">Location Details</h5>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold small">Street Address</Form.Label>
              <Form.Control
                type="text"
                placeholder="123 Medical Boulevard"
                disabled={isLoading}
                {...formik.getFieldProps("address")}
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold small">City</Form.Label>
                  <Form.Control
                    type="text"
                    disabled={isLoading}
                    {...formik.getFieldProps("city")}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold small">State / Province</Form.Label>
                  <Form.Control
                    type="text"
                    disabled={isLoading}
                    {...formik.getFieldProps("state")}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold small">Country</Form.Label>
                  <Form.Select
                    disabled={isLoading}
                    {...formik.getFieldProps("country")}
                    isInvalid={!!(formik.touched.country && formik.errors.country)}
                  >
                    <option value="PK">Pakistan (PK)</option>
                    <option value="US">United States (US)</option>
                    <option value="UK">United Kingdom (UK)</option>
                    <option value="AE">United Arab Emirates (AE)</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold small">Postal Code</Form.Label>
                  <Form.Control
                    type="text"
                    disabled={isLoading}
                    {...formik.getFieldProps("postalCode")}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Button 
              variant="primary" 
              type="submit" 
              className="w-100 py-3 fw-bold mt-4"
              disabled={isLoading || !formik.isValid}
            >
              {isLoading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                  Saving...
                </>
              ) : (
                "Complete Setup"
              )}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Onboarding