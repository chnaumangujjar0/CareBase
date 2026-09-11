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

import userRouter from "./routes/user.routes"
import { errorHandler } from "./middlewares/error.middleware";

// routes intialization
app.use("/api/v1/users",userRouter)
app.use(errorHandler)


export {httpServer,app}