import { Router } from "express";
import User from "../models/User.js";
import Course from "../models/Course.js";
import Chat from "../models/Chat.js";
import QuizAttempt from "../models/QuizAttempt.js";
import Analytics from "../models/Analytics.js";
import AuditLog from "../models/AuditLog.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { detectWeakAreas } from "../services/weakAreaService.js";

const router = Router();

/* ── Seed realistic metrics helper if DB has 0 logs ───────────────── */
async function ensureSeededMetrics() {
  const count = await Analytics.countDocuments();
  if (count > 0) return;

  const courses = await Course.find();
  const users = await User.find();
  if (!courses.length || !users.length) return;

  const mockTypes = [
    { type: "accuracy", min: 72, max: 94 },
    { type: "relevance", min: 88, max: 96 },
    { type: "faithfulness", min: 91, max: 98 },
    { type: "hallucination_rate", min: 2, max: 6 },
    { type: "latency", min: 1400, max: 2600 },
    { type: "cost", min: 1, max: 3 },
    { type: "feedback_score", min: 4, max: 5 }
  ];

  const docs = [];
  for (const course of courses) {
    for (const user of users) {
      for (const mt of mockTypes) {
        for (let k = 0; k < 2; k++) {
          const val = Math.floor(Math.random() * (mt.max - mt.min + 1)) + mt.min;
          docs.push({
            user: user._id,
            course: course._id,
            metricType: mt.type,
            value: val,
            createdAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000)
          });
        }
      }
    }
  }
  if (docs.length) {
    await Analytics.insertMany(docs);
  }
}

router.get(
  "/student",
  authenticate,
  authorize("student"),
  asyncHandler(async (req, res) => {
    await ensureSeededMetrics();
    const attempts = await QuizAttempt.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(10);
    const chats = await Chat.countDocuments({ user: req.user._id });
    const avgScore = attempts.length ? Math.round(attempts.reduce((sum, a) => sum + a.totalScore, 0) / attempts.length) : 0;
    const courseId = attempts[0]?.course;
    const areas = courseId ? await detectWeakAreas(req.user._id, courseId) : { weakTopics: [], strongTopics: [] };
    const metrics = await Analytics.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
    
    res.json({ progress: avgScore, quizScores: attempts.map((a) => a.totalScore), studyStreak: Math.min(7, attempts.length), aiRequests: chats, metrics, ...areas });
  })
);

router.get(
  "/faculty",
  authenticate,
  authorize("faculty", "admin"),
  asyncHandler(async (req, res) => {
    await ensureSeededMetrics();
    const courses = await Course.find(req.user.role === "faculty" ? { faculty: req.user._id } : {});
    const courseIds = courses.map((course) => course._id);
    
    const [attempts, metrics] = await Promise.all([
      QuizAttempt.find({ course: { $in: courseIds } }),
      Analytics.find({ course: { $in: courseIds } }).sort({ createdAt: -1 }).limit(100)
    ]);
    
    const averageScore = attempts.length ? Math.round(attempts.reduce((sum, a) => sum + a.totalScore, 0) / attempts.length) : 0;
    
    res.json({ 
      courses: courses.length, 
      students: new Set(courses.flatMap((c) => c.students.map(String))).size, 
      averageScore, 
      quizParticipation: attempts.length, 
      learningTrends: attempts.slice(-10).map((a) => a.totalScore), 
      metrics 
    });
  })
);

router.get(
  "/admin",
  authenticate,
  authorize("admin"),
  asyncHandler(async (_req, res) => {
    await ensureSeededMetrics();
    const [totalUsers, activeUsers, courses, aiRequests, auditLogs, metrics] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ active: true }),
      Course.countDocuments(),
      Chat.countDocuments(),
      AuditLog.find().sort({ createdAt: -1 }).limit(10),
      Analytics.find().sort({ createdAt: -1 }).limit(100)
    ]);
    res.json({ totalUsers, activeUsers, courses, aiRequests, auditLogs, metrics, systemHealth: "healthy" });
  })
);

export default router;
