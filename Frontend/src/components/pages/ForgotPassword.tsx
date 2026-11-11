import { useState } from "react";
import { Link } from "react-router";
import { Container, Card, Form, Button } from "react-bootstrap";
import { Spin } from "antd";
import { useFormik } from "formik";
import * as Yup from "yup";
import Logo from "../../assets/carebase-logo-full.svg";
import { getApiErrorMessage, requestPasswordReset } from "../../services/api";

const ForgotPassword = () => {
  const [submitted, setSubmitted] = useState(false);
  const formik = useFormik({
    initialValues: { email: "" },
    validationSchema: Yup.object({
      email: Yup.string().email("Please enter a valid email address").required("Email is required"),
    }),
    onSubmit: async ({ email }, { setSubmitting, setStatus }) => {
      try {
        await requestPasswordReset(email);
        setSubmitted(true);
      } catch (error: unknown) {
        setStatus(getApiErrorMessage(error, "Unable to send the reset email. Please try again."));
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <Container fluid className="auth-shell d-flex vh-100 align-items-center justify-content-center">
      <Card className="auth-card border-0 shadow">
        <Card.Body className="p-4 p-md-5">
          <div className="text-center mb-4">
            <img src={Logo} alt="CareBase logo" />
            <p className="text-muted small mt-4 mb-0">Reset your password</p>
          </div>
          {submitted ? (
            <div className="text-center">
              <p className="text-muted">If an active account exists for that email, a reset link has been sent.</p>
              <Link to="/login" className="fw-semibold text-decoration-none">Return to sign in</Link>
            </div>
          ) : (
            <Form onSubmit={formik.handleSubmit} noValidate>
              {formik.status && <div className="alert alert-danger">{formik.status}</div>}
              <Form.Group className="mb-4" controlId="forgotEmail">
                <Form.Label className="fw-semibold">Staff Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="doctor@carebase.com"
                  disabled={formik.isSubmitting}
                  {...formik.getFieldProps("email")}
                  isInvalid={!!(formik.touched.email && formik.errors.email)}
                />
                <Form.Control.Feedback type="invalid">{formik.errors.email}</Form.Control.Feedback>
              </Form.Group>
              <Button type="submit" className="w-100 py-2 fw-semibold" disabled={formik.isSubmitting}>
                {formik.isSubmitting ? <><Spin size="small" style={{ marginRight: 8 }} />Sending...</> : "Send reset link"}
              </Button>
              <div className="text-center mt-3"><Link to="/login" className="small fw-semibold text-decoration-none">Back to sign in</Link></div>
            </Form>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ForgotPassword;
