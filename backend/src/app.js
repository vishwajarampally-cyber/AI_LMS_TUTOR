import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { generalLimiter } from "./middleware/rateLimit.js";
import { errorHandler, notFound } from "./middleware/error.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import courseRoutes from "./routes/course.routes.js";
import materialRoutes from "./routes/material.routes.js";
import tutorRoutes from "./routes/tutor.routes.js";
import quizRoutes from "./routes/quiz.routes.js";
import evaluationRoutes from "./routes/evaluation.routes.js";
import studyPlanRoutes from "./routes/studyPlan.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js";
import path from "path";
import studyMaterialRoutes from "./routes/studyMaterial.routes.js";

dotenv.config();

const app = express();
const allowedOrigins = [
  ...(process.env.FRONTEND_URL?.split(",").map((origin) => origin.trim()).filter(Boolean) || []),
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(generalLimiter);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ai-lms-tutor-api", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/tutor", tutorRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/evaluations", evaluationRoutes);
app.use("/api/study-plans", studyPlanRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/study-materials", studyMaterialRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
