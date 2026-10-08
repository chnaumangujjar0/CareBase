import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";
import http from "http"
import {Server} from "socket.io"

const app = express()
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN, 
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.set("io",io)
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(express.json({limit : "16kb"}))
app.use(express.urlencoded({extended : true, limit : "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())



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

// routes intialization
app.use("/api/v1/user",userRouter)
app.use("/api/v1/tenant",tenantRouter)
app.use("/api/v1/department",departmentRouter)
app.use("/api/v1/staff",staffRouter)
app.use("/api/v1/appointments",appointmentRouter)
app.use("/api/v1/patients",patientRouter)
app.use("/api/v1/roles",roleRouter)
app.use("/api/v1/facility",facilityRouter)
app.use(errorHandler)
export {httpServer,app}