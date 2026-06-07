import { Router } from "express";
import { body, query } from "express-validator";
import Course from "../models/Course.js";
import Quiz from "../models/Quiz.js";
import QuizAttempt from "../models/QuizAttempt.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { generateAdaptiveQuiz, nextDifficulty } from "../agents/quizAgent.js";
import { gradeQuestion } from "../utils/quizGrading.js";
import { writeAudit } from "../utils/audit.js";
import { recordMetric } from "../utils/metrics.js";

const router = Router();

function canAccessCourse(user, course) {
  if (user.role === "admin") return true;
  if (user.role === "faculty" && String(course.faculty) === String(user._id)) return true;
  if (user.role === "student") {
    return course.status === "active" || course.students.some((id) => String(id) === String(user._id));
  }
  return false;
}

router.get(
  "/bank",
  authenticate,
  [query("courseId").notEmpty(), query("topic").optional().trim()],
  validate,
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.query.courseId);
    if (!course) throw new ApiError(404, "Course not found");
    if (!canAccessCourse(req.user, course)) throw new ApiError(403, "You do not have access to this subject");

    const topicFilter = req.query.topic?.trim();
    const quizzes = await Quiz.find({ course: course._id }).sort({ createdAt: -1 }).limit(40);

    const items = [];
    for (const quiz of quizzes) {
      for (const question of quiz.questions) {
        if (topicFilter && topicFilter !== "all" && question.topic !== topicFilter) continue;
        items.push({
          quizTitle: quiz.title,
          topic: question.topic || "General",
          type: question.type,
          prompt: question.prompt,
          answer: question.answer,
          options: question.options || []
        });
      }
    }

    res.json({
      course: { _id: course._id, title: course.title, code: course.code, topics: course.topics || [] },
      items,
      total: items.length
    });
  })
);

router.post(
  "/generate",
  authenticate,
  authorize("student", "faculty", "admin"),
  aiLimiter,
  [
    body("courseId").notEmpty(),
    body("difficulty").optional().customSanitizer(v => typeof v === "string" ? v.toLowerCase() : v).isIn(["easy", "medium", "hard"]),
    body("topic").optional().trim()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.body.courseId);
    if (!course) throw new ApiError(404, "Course not found");
    const lastAttempt = await QuizAttempt.findOne({ user: req.user._id, course: course._id }).sort({ createdAt: -1 });
    const difficulty = (req.body.difficulty || lastAttempt?.nextDifficulty || "medium").toLowerCase();
    
    const selectedTopic = req.body.topic && req.body.topic !== "all" ? req.body.topic : null;
    const topicsList = selectedTopic ? [selectedTopic] : course.topics;

    const payload = await generateAdaptiveQuiz({ 
      courseTitle: course.title, 
      topics: topicsList, 
      difficulty 
    });
    
    const quiz = await Quiz.create({ ...payload, course: course._id, user: req.user._id });
    await writeAudit(req, "GENERATE_QUIZ", "Quiz", quiz._id, { course: course._id, difficulty, topic: selectedTopic });
    res.status(201).json({ quiz });
  })
);

router.post(
  "/attempts",
  authenticate,
  authorize("student", "faculty", "admin"),
  [body("quizId").notEmpty(), body("answers").isArray({ min: 1 })],
  validate,
  asyncHandler(async (req, res) => {
    const quiz = await Quiz.findById(req.body.quizId);
    if (!quiz) throw new ApiError(404, "Quiz not found");
    const graded = quiz.questions.map((question, idx) => {
      const submitted = req.body.answers[idx]?.answer || "";
      const result = gradeQuestion(question, submitted);
      return {
        prompt: question.prompt,
        type: question.type,
        answer: submitted,
        expected: question.answer,
        score: result.score,
        feedback: result.feedback,
        topic: question.topic
      };
    });
    const totalScore = Math.round(graded.reduce((sum, item) => sum + item.score, 0) / graded.length);
    const attempt = await QuizAttempt.create({
      quiz: quiz._id,
      user: req.user._id,
      course: quiz.course,
      answers: graded,
      totalScore,
      nextDifficulty: nextDifficulty(totalScore)
    });
    await recordMetric({ user: req.user._id, course: quiz.course, metricType: "accuracy", value: totalScore });
    await writeAudit(req, "SUBMIT_QUIZ_ATTEMPT", "QuizAttempt", attempt._id, { totalScore });
    res.status(201).json({ attempt });
  })
);

router.get(
  "/history",
  authenticate,
  authorize("student", "faculty", "admin"),
  asyncHandler(async (req, res) => {
    const attempts = await QuizAttempt.find({ user: req.user._id }).populate("course", "title code").sort({ createdAt: -1 }).limit(30);
    res.json({ attempts });
  })
);

export default router;
