import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import familyRoutes from "./routes/families.js";
import custodyRoutes from "./routes/custody.js";
import expenseRoutes from "./routes/expenses.js";
import messageRoutes from "./routes/messages.js";
import dashboardRoutes from "./routes/dashboard.js";
import uploadRoutes from "./routes/uploads.js";
import auditRoutes from "./routes/audit.js";
import notificationRoutes from "./routes/notifications.js";
import exportRoutes from "./routes/export.js";
import { errorHandler, notFound } from "./middleware/errors.js";

const app = express();
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    const localDevelopmentOrigin = config.nodeEnv !== "production" && /^http:\/\/localhost:\d+$/.test(origin || "");
    if (!origin || origin === config.clientUrl || localDevelopmentOrigin) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
}));
app.use(express.json({ limit: "1mb" }));
if (config.nodeEnv !== "test") app.use(morgan("dev"));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/families", familyRoutes);
app.use("/api/family", familyRoutes);
app.use("/api/custody-events", custodyRoutes);
app.use("/api/custody", custodyRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/export", exportRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
