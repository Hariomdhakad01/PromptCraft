import cookieParser from "cookie-parser"
import cors from "cors"
import express from "express"
import morgan from "morgan"
import config from "./config/config.js"
import authRoutes from "./routes/auth.routes.js"
import chatRoutes from "./routes/chat.routes.js"
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js"

const app = express()

app.use(cors({
    origin: config.corsOrigin === "*" ? true : config.corsOrigin,
    credentials: true,
}))
app.use(morgan("dev"))
app.use(express.json({ limit: "1mb" }))
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

app.get("/", (_req, res) => {
    res.json({
        name: "NewGen AI API",
        status: "ok",
        features: ["SSE chat", "PDF upload", "persistent memory"],
    })
})

app.get("/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime() })
})

app.use("/api/auth", authRoutes)
app.use("/api/chat", chatRoutes)
app.use(notFoundHandler)
app.use(errorHandler)

export default app
