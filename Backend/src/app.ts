import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";
import http from "http"
import {Server} from "socket.io"
import { registerPublicAppointmentSockets } from "./services/public-appointment-socket.service.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import { handleStripeWebhook } from "./controllers/subscription.controller.js"

const app = express()
const httpServer = http.createServer(app);
const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin is not allowed by CORS"));
  },
  credentials: true,
};

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.set("io",io)
registerPublicAppointmentSockets(io)
app.use(cors(corsOptions))
// Stripe signature verification requires the original request bytes, before JSON parsing.
app.post("/api/v1/subscriptions/webhook", express.raw({ type: "application/json" }), handleStripeWebhook)
app.use(express.json({limit : "16kb"}))
app.use(express.urlencoded({extended : true, limit : "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
})



// roter imports

import userRouter from "./routes/user.routes.js"
import { errorHandler } from "./middlewares/error.middleware";
import tenantRouter from "./routes/tenant.routes.js"
import departmentRouter from "./routes/department.routes.js"
import staffRouter from "./routes/staff.routes.js"
import appointmentRouter from "./routes/appointment.routes.js"
import patientRouter from "./routes/patient.routes.js"
import roleRouter from "./routes/role.routes.js"
import facilityRouter from "./routes/facility.routes.js"
import clinicalRouter from "./routes/clinical.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"
import auditRouter from "./routes/audit.routes.js"
import pharmacyRouter from "./routes/pharmacy.routes.js"
import billingRouter from "./routes/billing.routes.js"
import medicineRouter from "./routes/medicine.routes.js"
import superAdminRouter from "./routes/superAdmin.routes.js"
import publicAppointmentRouter from "./routes/publicAppointment.routes.js"
import aiRouter from "./routes/detailExtractor.routes.js"

// routes intialization
app.use("/api/v1/user",userRouter)
app.use("/api/v1/tenant",tenantRouter)
app.use("/api/v1/department",departmentRouter)
app.use("/api/v1/staff",staffRouter)
app.use("/api/v1/appointments",appointmentRouter)
app.use("/api/v1/patients",patientRouter)
app.use("/api/v1/roles",roleRouter)
app.use("/api/v1/facility",facilityRouter)
app.use("/api/v1/clinical",clinicalRouter)
app.use("/api/v1/dashboard",dashboardRouter)
app.use("/api/v1/audit-logs",auditRouter)
app.use("/api/v1/pharmacies",pharmacyRouter)
app.use("/api/v1/billing",billingRouter)
app.use("/api/v1/medicines",medicineRouter)
app.use("/api/v1/clinical/medicines",medicineRouter)
app.use("/api/v1/super-admin", superAdminRouter)
app.use("/api/v1/public", publicAppointmentRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/ai",aiRouter)
app.use(errorHandler)
export {httpServer,app}
