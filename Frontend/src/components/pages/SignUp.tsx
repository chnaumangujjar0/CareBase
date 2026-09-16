import { useNavigate, Link } from "react-router";
import { useDispatch } from "react-redux";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Card, Form, Button, Alert, Spinner } from "react-bootstrap";
import { setUser } from "../../store/authSlice";
import { toast } from "react-toastify";
import Logo from "../../assets/carebase-logo-full.svg"
import { registerUser } from "../../services/api";
import type { AuthUser } from "../../types/auth";
import { useState } from "react";
import Loader from "../common/Loader";

export const SignUp = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLoading,setIsLoading] = useState(false)

  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .required("Full name is required"),
      email: Yup.string()
        .email("Please enter a valid email address")
        .required("Email is required"),
      password: Yup.string()
        .min(8, "Password must be at least 8 characters")
        .required("Password is required"),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref("password")], "Passwords must match")
        .required("Please confirm your password"),
    }),
    onSubmit: async (values, { setStatus }) => {
      setIsLoading(true)
      try {
        
        const { confirmPassword, ...submitData } = values;
        console.log(submitData);
        const userData = await registerUser(submitData);
        const userDetails = userData.user;
        const role = userData.role?.name ?? userDetails.role ?? "user";
        const user: AuthUser = { ...userDetails, role };
        dispatch(setUser(user));
        
        if (userData.accessToken) {
          localStorage.setItem("accessToken", userData.accessToken);
        }

        if (userData.refreshToken) {
          localStorage.setItem("refreshToken", userData.refreshToken);
        }
        
        toast.success("Account created successfully!");
        navigate("/onboarding");
      } catch (err: any) {
        const errorMsg = err?.data?.message || "Registration failed. Please try again.";
        setStatus(errorMsg);
        toast.error(errorMsg);
      }finally{
        setIsLoading(false)
      }
    },
  });

  return (
    <div className="auth-shell d-flex min-vh-100 align-items-center justify-content-center p-3">
    <Loader isLoading={isLoading}/>
      <Card className="auth-card border-0 p-4">
        <Card.Body>
          <div className="text-center mb-4">
            <img src={Logo} />
          </div>

          {formik.status && (
            <Alert variant="danger" className="text-center py-2">
              {formik.status}
            </Alert>
          )}

          <Form onSubmit={formik.handleSubmit}>
            <Form.Group className="mb-3" controlId="formname">
              <Form.Label className="fw-semibold small">Full Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Dr. Jane Doe"
                disabled={isLoading}
                {...formik.getFieldProps("name")}
                isInvalid={!!(formik.touched.name && formik.errors.name)}
              />
              <Form.Control.Feedback type="invalid">
                {formik.errors.name}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3" controlId="formEmail">
              <Form.Label className="fw-semibold small">Staff Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="jane.doe@carebase.com"
                disabled={isLoading}
                {...formik.getFieldProps("email")}
                isInvalid={!!(formik.touched.email && formik.errors.email)}
              />
              <Form.Control.Feedback type="invalid">
                {formik.errors.email}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3" controlId="formPassword">
              <Form.Label className="fw-semibold small">Password</Form.Label>
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

            <Form.Group className="mb-4" controlId="formConfirmPassword">
              <Form.Label className="fw-semibold small">Confirm Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="••••••••"
                disabled={isLoading}
                {...formik.getFieldProps("confirmPassword")}
                isInvalid={!!(formik.touched.confirmPassword && formik.errors.confirmPassword)}
              />
              <Form.Control.Feedback type="invalid">
                {formik.errors.confirmPassword}
              </Form.Control.Feedback>
            </Form.Group>

            <Button 
              variant="primary" 
              type="submit" 
              className="w-100 py-2 fw-semibold mb-3"
              disabled={isLoading || !formik.isValid}
            >
              {isLoading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Registering...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
            
            <div className="text-center">
              <span className="text-muted small">Already have an account? </span>
              <Link to="/login" className="small fw-semibold text-decoration-none">
                Log In
              </Link>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};