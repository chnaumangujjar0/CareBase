import { useNavigate } from "react-router";
import { useDispatch } from "react-redux";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Container, Card, Form, Button, Alert, Spinner } from "react-bootstrap";
import { useLoginMutation } from "../../store/hospitalApi";
import { setUser } from "../../store/authSlice";
import Logo from "../../assets/carebase-logo-full.svg"
const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [loginApi, { isLoading }] = useLoginMutation();

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
    onSubmit: async (values, { setStatus }) => {
      try {
        const userData = await loginApi(values).unwrap();
        dispatch(setUser(userData));
        navigate("/");
      } catch (err: any) {
        setStatus(err?.data?.message || "Invalid credentials. Please try again.");
      }
    },
  });

  return (
    
    <Container fluid className="auth-shell d-flex vh-100 align-items-center justify-content-center">
      <Card className="auth-card border-0 shadow">
        <Card.Body className="p-4 p-md-5">
          <div className="text-center mb-4">
            <img src={Logo}/>
            <p className="text-muted small mb-0">Hospital Management System</p>
          </div>

          {formik.status && (
            <Alert variant="danger" className="text-center py-2">
              {formik.status}
            </Alert>
          )}

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

            {/*
              Bug fix: the original disabled={isLoading || !formik.isValid}
              disables the button on first render, before the user has
              typed anything — Formik evaluates isValid against the empty
              initial values. Submit should stay enabled so Yup's error
              messages actually surface on click; isLoading alone is
              enough to prevent double-submits.
            */}
            <Button
              variant="primary"
              type="submit"
              className="w-100 py-2 fw-semibold"
              disabled={isLoading}
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
  );
};

export default Login;