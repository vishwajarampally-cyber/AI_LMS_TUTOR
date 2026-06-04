import { Router } from "express";
import { body } from "express-validator";
import Course from "../models/Course.js";
import StudyPlan from "../models/StudyPlan.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { createStudyPlan } from "../agents/studyPlannerAgent.js";
import { detectWeakAreas } from "../services/weakAreaService.js";
import { writeAudit } from "../utils/audit.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("student"),
  aiLimiter,
  [body("courseId").notEmpty()],
  validate,
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.body.courseId);
    if (!course) throw new ApiError(404, "Course not found");
    const areas = await detectWeakAreas(req.user._id, course._id);
    const plan = await createStudyPlan({ courseTitle: course.title, ...areas });
    const studyPlan = await StudyPlan.create({ user: req.user._id, course: course._id, ...areas, ...plan });
    await writeAudit(req, "GENERATE_STUDY_PLAN", "StudyPlan", studyPlan._id, { course: course._id });
    res.status(201).json({ studyPlan });
  })
);

router.get(
  "/latest",
  authenticate,
  authorize("student"),
  asyncHandler(async (req, res) => {
    const studyPlan = await StudyPlan.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ studyPlan });
  })
);

export default router;
