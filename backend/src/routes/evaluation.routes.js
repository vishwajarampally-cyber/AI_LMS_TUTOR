import { Router } from "express";
import { body } from "express-validator";
import Evaluation from "../models/Evaluation.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { detectPromptInjection } from "../utils/security.js";
import { ApiError } from "../utils/apiError.js";
import { evaluateAnswer } from "../agents/evaluationAgent.js";
import { writeAudit } from "../utils/audit.js";
import { recordMetric } from "../utils/metrics.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("student"),
  aiLimiter,
  [body("question").trim().notEmpty(), body("answer").trim().notEmpty(), body("courseId").optional().notEmpty()],
  validate,
  asyncHandler(async (req, res) => {
    if (detectPromptInjection(req.body.question) || detectPromptInjection(req.body.answer)) throw new ApiError(400, "Unsafe input detected");
    const start = Date.now();
    const result = await evaluateAnswer(req.body);
    const latencyMs = Date.now() - start;
    const evaluation = await Evaluation.create({ ...req.body, ...result, course: req.body.courseId, user: req.user._id, latencyMs });
    await recordMetric({ user: req.user._id, course: req.body.courseId, metricType: "accuracy", value: result.score });
    await writeAudit(req, "EVALUATE_ANSWER", "Evaluation", evaluation._id, { score: result.score });
    res.status(201).json({ evaluation });
  })
);

router.get(
  "/history",
  authenticate,
  authorize("student"),
  asyncHandler(async (req, res) => {
    const evaluations = await Evaluation.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30);
    res.json({ evaluations });
  })
);

export default router;
