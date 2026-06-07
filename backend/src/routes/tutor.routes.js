import { Router } from "express";
import { body, query } from "express-validator";
import ChatSession from "../models/ChatSession.js";
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

// Legacy ask endpoint (compatibility fallback)
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

// Get all chat sessions (paginated, searchable, favorite-filterable)
router.get(
  "/sessions",
  authenticate,
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1 }).toInt(),
    query("search").optional().trim(),
    query("isBookmarked").optional().isBoolean().toBoolean()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };

    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { "messages.text": { $regex: req.query.search, $options: "i" } }
      ];
    }

    if (req.query.isBookmarked === true) {
      filter.isBookmarked = true;
    }

    const sessions = await ChatSession.find(filter)
      .select("title course isBookmarked createdAt updatedAt")
      .populate("course", "title code")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ChatSession.countDocuments(filter);

    res.json({
      sessions,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  })
);

// Create new chat session
router.post(
  "/sessions",
  authenticate,
  [
    body("courseId").optional().isMongoId().withMessage("Invalid course ID"),
    body("title").optional().trim().isLength({ min: 1 })
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { courseId, title = "New Chat" } = req.body;
    const session = await ChatSession.create({
      user: req.user._id,
      course: courseId || null,
      title,
      messages: []
    });
    await writeAudit(req, "CREATE_CHAT_SESSION", "ChatSession", session._id, { courseId });
    res.status(201).json({ session });
  })
);

// Clear all sessions for current user
router.delete(
  "/sessions",
  authenticate,
  asyncHandler(async (req, res) => {
    await ChatSession.deleteMany({ user: req.user._id });
    await writeAudit(req, "CLEAR_ALL_CHAT_SESSIONS", "ChatSession", null, {});
    res.json({ message: "All chat conversations cleared successfully" });
  })
);

// Get single session detail
router.get(
  "/sessions/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const session = await ChatSession.findOne({ _id: req.params.id, user: req.user._id }).populate("course", "title code topics");
    if (!session) throw new ApiError(404, "Chat session not found");
    res.json({ session });
  })
);

// Delete individual session
router.delete(
  "/sessions/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const session = await ChatSession.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!session) throw new ApiError(404, "Chat session not found");
    await writeAudit(req, "DELETE_CHAT_SESSION", "ChatSession", session._id, {});
    res.json({ message: "Chat session deleted successfully", sessionId: req.params.id });
  })
);

// Toggle bookmark on a session
router.patch(
  "/sessions/:id/bookmark",
  authenticate,
  asyncHandler(async (req, res) => {
    const session = await ChatSession.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) throw new ApiError(404, "Chat session not found");
    session.isBookmarked = !session.isBookmarked;
    await session.save();
    await writeAudit(req, "TOGGLE_BOOKMARK_CHAT_SESSION", "ChatSession", session._id, { isBookmarked: session.isBookmarked });
    res.json({ session });
  })
);

// Post question to an existing session
router.post(
  "/sessions/:id/ask",
  authenticate,
  aiLimiter,
  [
    body("question").trim().isLength({ min: 3, max: 1200 }),
    body("language").optional().isIn(["English", "Hindi", "Telugu"])
  ],
  validate,
  asyncHandler(async (req, res) => {
    const session = await ChatSession.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) throw new ApiError(404, "Chat session not found");

    const question = clampQuery(req.body.question);
    if (detectPromptInjection(question)) {
      await writeAudit(req, "BLOCK_PROMPT_INJECTION", "ChatSession", session._id, { question });
      throw new ApiError(400, "Unsafe prompt detected. Please ask a course-related question.");
    }

    const language = req.body.language || "English";

    // Call tutorAgent with session history context
    const start = Date.now();
    const result = await answerStudentQuestion({
      courseId: session.course,
      question,
      history: session.messages,
      language
    });
    const latencyMs = Date.now() - start;

    // Append to messages list
    session.messages.push({
      role: "student",
      text: question,
      language,
      createdAt: new Date()
    });

    const aiMsgIndex = session.messages.push({
      role: "ai",
      text: result.answer,
      sourceTitles: [ ...new Set((result.citations || []).map((c) => c.title).filter(Boolean)) ],
      language,
      createdAt: new Date()
    }) - 1;

    // Auto-rename session if it has only one question pair
    if (session.title === "New Chat" || session.messages.length <= 2) {
      session.title = question.slice(0, 40) + (question.length > 40 ? "..." : "");
    }

    await session.save();

    await recordAiMetrics({
      user: req.user._id,
      course: session.course,
      latencyMs,
      faithfulness: result.faithfulness,
      hallucinationRate: result.hallucinationRate
    });

    await writeAudit(req, "AI_TUTOR_SESSION_REQUEST", "ChatSession", session._id, { courseId: session.course });

    res.json({ session, aiMessage: session.messages[aiMsgIndex] });
  })
);

export default router;
