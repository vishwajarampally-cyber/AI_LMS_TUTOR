import { Router } from "express";
import { body } from "express-validator";
import Chat from "../models/Chat.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { clampQuery, detectPromptInjection } from "../utils/security.js";
import { answerStudentQuestion } from "../agents/tutorAgent.js";
import { writeAudit } from "../utils/audit.js";
import { recordAiMetrics } from "../utils/metrics.js";

const router = Router();

router.post(
  "/ask",
  authenticate,
  authorize("student", "faculty", "admin"),
  aiLimiter,
  [body("courseId").notEmpty(), body("question").trim().isLength({ min: 3, max: 1200 })],
  validate,
  asyncHandler(async (req, res) => {
    const question = clampQuery(req.body.question);
    if (detectPromptInjection(question)) {
      await writeAudit(req, "BLOCK_PROMPT_INJECTION", "Chat", null, { question });
      throw new ApiError(400, "Unsafe prompt detected. Please ask a course-related question.");
    }

    const start = Date.now();
    const result = await answerStudentQuestion({ courseId: req.body.courseId, question });
    const latencyMs = Date.now() - start;
    const chat = await Chat.create({ user: req.user._id, course: req.body.courseId, question, answer: result.answer, citations: result.citations, latencyMs });
    await recordAiMetrics({ user: req.user._id, course: req.body.courseId, latencyMs, faithfulness: result.faithfulness, hallucinationRate: result.hallucinationRate });
    await writeAudit(req, "AI_TUTOR_REQUEST", "Chat", chat._id, { courseId: req.body.courseId });
    res.json({ chat });
  })
);

export default router;
