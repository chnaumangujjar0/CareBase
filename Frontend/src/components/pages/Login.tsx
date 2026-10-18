import { useNavigate } from "react-router";
import { useDispatch } from "react-redux";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Container, Card, Form, Button } from "react-bootstrap";
import { Spin } from "antd";
import { setUser } from "../../store/authSlice";
import Logo from "../../assets/carebase-logo-full.svg";
import { getApiErrorMessage, loginUser } from "../../services/api";
import { toast } from "react-toastify";
import type { AuthUser } from "../../types/auth";
import { useState } from "react";

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email("Please enter a valid staff email address")
        .required("Email is required"),
      password: Yup.string()
        .min(8, "Password must be at least 8 characters")
        .required("Password is required"),
    }),
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        const userData = await loginUser(values);
        const userDetails = userData.user;
        const role = userData.role?.name ?? userDetails.role ?? "user";
        const user: AuthUser = {
          ...userDetails,
          role,
          permissions: userData.role?.permissions,
        };

        dispatch(setUser(user));
        localStorage.setItem("accessToken", userData.accessToken);

        if (userData.refreshToken) {
          localStorage.setItem("refreshToken", userData.refreshToken);
        }

        navigate("/dashboard");
      } catch (error: unknown) {
        toast.error(getApiErrorMessage(error, "Unable to sign in. Please try again."));
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <>
      <Spin fullscreen spinning={isLoading} tip="Authenticating..." />
      <Container fluid className="auth-shell d-flex vh-100 align-items-center justify-content-center">
        <Card className="auth-card border-0 shadow">
          <Card.Body className="p-4 p-md-5">
            <div className="text-center mb-4">
              <img src={Logo} alt="CareBase logo" />
              <p className="text-muted small mt-4 mb-0">Hospital Management System</p>
            </div>

            <Form onSubmit={formik.handleSubmit} noValidate>
              <Form.Group className="mb-3" controlId="formEmail">
                <Form.Label className="fw-semibold">Staff Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="doctor@carebase.com"
                  disabled={isLoading}
                  {...formik.getFieldProps("email")}
                  isInvalid={!!(formik.touched.email && formik.errors.email)}
                />
                <Form.Control.Feedback type="invalid">
                  {formik.errors.email}
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-4" controlId="formPassword">
                <Form.Label className="fw-semibold">Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="••••••••"
                  disabled={isLoading}
                  {...formik.getFieldProps("password")}
                  isInvalid={!!(formik.touched.password && formik.errors.password)}
                />
                <Form.Control.Feedback type="invalid">
                  {formik.errors.password}
                </Form.Control.Feedback>
              </Form.Group>

              <Button
                variant="primary"
                type="submit"
                className="w-100 py-2 fw-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Spin size="small" style={{ marginRight: 8 }} />
                    Authenticating...
                  </>
                ) : (
                  "Sign In to CareBase"
                )}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </Container>
    </>
  );
};

export default Login;
