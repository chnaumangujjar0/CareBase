import { useNavigate } from "react-router";
import { useDispatch } from "react-redux";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useLoginMutation } from "../../store/hospitalApi";
import { setUser } from "../../store/authSlice";

export const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Bring in the RTK Query mutation hook
  const [loginApi, { isLoading }] = useLoginMutation();

  // Formik Setup
  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    // Production-grade validation using Yup
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
        // .unwrap() extracts the payload or throws the API error directly
        const userData = await loginApi(values).unwrap();
        
        // Save token and user details to Redux
        dispatch(setUser(userData));
        
        // Redirect to the main dashboard
        navigate("/");
      } catch (err: any) {
        // Handle API errors (e.g., 401 Unauthorized)
        setStatus(err?.data?.message || "Invalid credentials. Please try again.");
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-[url('/path/to/abstract-medical-bg.jpg')] bg-cover bg-center">
      {/* Glassmorphism Card Container */}
      <div className="w-full max-w-md p-8 m-4 bg-white/80 backdrop-blur-md border border-white/40 shadow-xl rounded-2xl">
        
        {/* Branding */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#0f223f] tracking-tight">
            Care<span className="text-blue-500">Base</span>
          </h1>
          <p className="text-gray-500 mt-2 text-sm font-medium">
            Hospital Management System
          </p>
        </div>

        {/* Global API Error Alert */}
        {formik.status && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm text-center">
            {formik.status}
          </div>
        )}

        <form onSubmit={formik.handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-semibold text-[#0f223f] mb-1">
              Staff Email
            </label>
            <input
              type="email"
              {...formik.getFieldProps("email")}
              disabled={isLoading}
              className={`w-full px-4 py-2.5 rounded-lg border bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                formik.touched.email && formik.errors.email
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300"
              }`}
              placeholder="doctor@carebase.com"
            />
            {formik.touched.email && formik.errors.email ? (
              <div className="text-red-500 text-xs mt-1 font-medium">
                {formik.errors.email}
              </div>
            ) : null}
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-semibold text-[#0f223f] mb-1">
              Password
            </label>
            <input
              type="password"
              {...formik.getFieldProps("password")}
              disabled={isLoading}
              className={`w-full px-4 py-2.5 rounded-lg border bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                formik.touched.password && formik.errors.password
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-300"
              }`}
              placeholder="••••••••"
            />
            {formik.touched.password && formik.errors.password ? (
              <div className="text-red-500 text-xs mt-1 font-medium">
                {formik.errors.password}
              </div>
            ) : null}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !formik.isValid}
            className="w-full py-3 px-4 mt-4 bg-[#0f223f] hover:bg-[#1a335a] text-white font-semibold rounded-lg shadow-md transition-colors disabled:opacity-70 flex justify-center items-center"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Authenticating...
              </span>
            ) : (
              "Sign In to CareBase"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};