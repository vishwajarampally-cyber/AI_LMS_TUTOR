import { Router } from "express";
import { body } from "express-validator";
import Course from "../models/Course.js";
import StudyGuide from "../models/StudyGuide.js";
import { authenticate } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { generateStudyNotes, generatePracticeGuide } from "../agents/studyMaterialAgent.js";
import { writeAudit } from "../utils/audit.js";

const router = Router();

router.post(
  "/generate",
  authenticate,
  aiLimiter,
  [
    body("courseId").notEmpty().withMessage("Course ID is required"),
    body("topic").notEmpty().withMessage("Topic is required"),
    body("type").isIn(["notes", "qa"]).withMessage("Type must be 'notes' or 'qa'")
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { courseId, topic, type } = req.body;

    const course = await Course.findById(courseId);
    if (!course) throw new ApiError(404, "Course not found");

    let content = "";
    if (type === "notes") {
      content = await generateStudyNotes({ courseId: course._id, courseTitle: course.title, topic });
    } else {
      content = await generatePracticeGuide({ courseId: course._id, courseTitle: course.title, topic });
    }

    const guide = await StudyGuide.create({
      course: course._id,
      user: req.user._id,
      topic,
      type,
      content
    });

    await writeAudit(req, "GENERATE_STUDY_GUIDE", "StudyGuide", guide._id, { courseId: course._id, topic, type });

    res.status(201).json({ guide });
  })
);

router.get(
  "/course/:courseId",
  authenticate,
  asyncHandler(async (req, res) => {
    const guides = await StudyGuide.find({
      course: req.params.courseId,
      user: req.user._id
    }).sort({ createdAt: -1 });

    res.json({ guides });
  })
);

router.delete(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const guide = await StudyGuide.findOne({ _id: req.params.id, user: req.user._id });
    if (!guide) throw new ApiError(404, "Study guide not found");

    await StudyGuide.findByIdAndDelete(guide._id);
    await writeAudit(req, "DELETE_STUDY_GUIDE", "StudyGuide", guide._id, { courseId: guide.course });

    res.json({ message: "Study guide deleted", guideId: guide._id });
  })
);

export default router;
