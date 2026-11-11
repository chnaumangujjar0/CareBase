import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Container, Card, Form, Button } from "react-bootstrap";
import { Spin } from "antd";
import { useFormik } from "formik";
import * as Yup from "yup";
import Logo from "../../assets/carebase-logo-full.svg";
import { getApiErrorMessage, resetPassword } from "../../services/api";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [completed, setCompleted] = useState(false);
  const formik = useFormik({
    initialValues: { password: "", confirmPassword: "" },
    validationSchema: Yup.object({
      password: Yup.string().min(12, "Password must be at least 12 characters").required("Password is required"),
      confirmPassword: Yup.string().oneOf([Yup.ref("password")], "Passwords must match").required("Please confirm your password"),
    }),
    onSubmit: async ({ password }, { setSubmitting, setStatus }) => {
      try {
        await resetPassword(token, password);
        setCompleted(true);
      } catch (error: unknown) {
        setStatus(getApiErrorMessage(error, "This reset link is invalid or expired."));
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <Container fluid className="auth-shell d-flex vh-100 align-items-center justify-content-center">
      <Card className="auth-card border-0 shadow">
        <Card.Body className="p-4 p-md-5">
          <div className="text-center mb-4"><img src={Logo} alt="CareBase logo" /><p className="text-muted small mt-4 mb-0">Choose a new password</p></div>
          {completed ? (
            <div className="text-center"><p className="text-muted">Your password has been reset successfully.</p><Link to="/login" className="fw-semibold text-decoration-none">Sign in to CareBase</Link></div>
          ) : !token ? (
            <div className="text-center"><p className="text-danger">This password reset link is invalid.</p><Link to="/forgot-password" className="fw-semibold text-decoration-none">Request a new link</Link></div>
          ) : (
            <Form onSubmit={formik.handleSubmit} noValidate>
              {formik.status && <div className="alert alert-danger">{formik.status}</div>}
              <Form.Group className="mb-3" controlId="newPassword">
                <Form.Label className="fw-semibold">New Password</Form.Label>
                <Form.Control type="password" disabled={formik.isSubmitting} {...formik.getFieldProps("password")} isInvalid={!!(formik.touched.password && formik.errors.password)} />
                <Form.Control.Feedback type="invalid">{formik.errors.password}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group className="mb-4" controlId="confirmPassword">
                <Form.Label className="fw-semibold">Confirm Password</Form.Label>
                <Form.Control type="password" disabled={formik.isSubmitting} {...formik.getFieldProps("confirmPassword")} isInvalid={!!(formik.touched.confirmPassword && formik.errors.confirmPassword)} />
                <Form.Control.Feedback type="invalid">{formik.errors.confirmPassword}</Form.Control.Feedback>
              </Form.Group>
              <Button type="submit" className="w-100 py-2 fw-semibold" disabled={formik.isSubmitting}>
                {formik.isSubmitting ? <><Spin size="small" style={{ marginRight: 8 }} />Saving...</> : "Reset password"}
              </Button>
            </Form>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ResetPassword;
