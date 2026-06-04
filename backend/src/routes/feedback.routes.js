import { Router } from "express";
import { body } from "express-validator";
import Feedback from "../models/Feedback.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recordMetric } from "../utils/metrics.js";

const router = Router();

router.post(
  "/",
  authenticate,
  [body("targetType").isIn(["chat", "quiz", "evaluation", "study_plan"]), body("score").isInt({ min: 1, max: 5 })],
  validate,
  asyncHandler(async (req, res) => {
    const feedback = await Feedback.create({ ...req.body, user: req.user._id });
    await recordMetric({ user: req.user._id, metricType: "feedback_score", value: req.body.score, metadata: { targetType: req.body.targetType } });
    res.status(201).json({ feedback });
  })
);

export default router;
