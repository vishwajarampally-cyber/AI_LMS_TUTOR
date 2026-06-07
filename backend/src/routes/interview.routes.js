import { Router } from "express";
import { body } from "express-validator";
import Interview from "../models/Interview.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { generateInterviewQuestions, evaluateInterview } from "../agents/interviewAgent.js";
import { writeAudit } from "../utils/audit.js";

const router = Router();

// Start a new interview
router.post(
  "/start",
  authenticate,
  [
    body("role").trim().notEmpty().withMessage("Target job role is required"),
    body("type").isIn(["technical", "hr"]).withMessage("Interview type must be 'technical' or 'hr'")
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { role, type } = req.body;
    
    // Generate questions
    const generatedQuestionsText = await generateInterviewQuestions({ role, type, count: 5 });
    
    const questionsPayload = generatedQuestionsText.map((q) => ({
      question: q,
      userAnswer: "",
      score: 0,
      feedback: ""
    }));

    const interview = await Interview.create({
      user: req.user._id,
      role,
      type,
      status: "in_progress",
      questions: questionsPayload,
      currentQuestionIndex: 0
    });

    await writeAudit(req, "START_MOCK_INTERVIEW", "Interview", interview._id, { role, type });

    res.status(201).json({ interview });
  })
);

// Submit answer for the current question
router.post(
  "/:id/answer",
  authenticate,
  [
    body("answer").trim().notEmpty().withMessage("Answer cannot be empty")
  ],
  validate,
  asyncHandler(async (req, res) => {
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
    if (!interview) throw new ApiError(404, "Interview session not found");
    if (interview.status === "completed") throw new ApiError(400, "Interview already completed");

    const currentIndex = interview.currentQuestionIndex;
    interview.questions[currentIndex].userAnswer = req.body.answer;

    if (currentIndex + 1 >= interview.questions.length) {
      // Last question answered - process evaluation
      interview.status = "completed";
      
      try {
        const evaluation = await evaluateInterview({
          role: interview.role,
          type: interview.type,
          questions: interview.questions
        });
        
        interview.overallScore = evaluation.overallScore || 0;
        interview.strengths = evaluation.strengths || [];
        interview.weaknesses = evaluation.weaknesses || [];
        interview.improvementAreas = evaluation.improvementAreas || "";
        
        // Update individual scores and feedback
        evaluation.questions?.forEach((eq, idx) => {
          if (interview.questions[idx]) {
            interview.questions[idx].score = eq.score || 0;
            interview.questions[idx].feedback = eq.feedback || "";
          }
        });
      } catch (err) {
        console.error("Failed to evaluate interview:", err);
        // Fallback scoring if LLM fails
        interview.overallScore = 60;
        interview.strengths = ["Completed all questions."];
        interview.weaknesses = ["Self-review recommended."];
        interview.improvementAreas = "Verify explanations match industry standards.";
      }

      await interview.save();
      await writeAudit(req, "COMPLETE_MOCK_INTERVIEW", "Interview", interview._id, { score: interview.overallScore });
    } else {
      interview.currentQuestionIndex = currentIndex + 1;
      await interview.save();
    }

    res.json({ interview });
  })
);

// Get interview history
router.get(
  "/history",
  authenticate,
  asyncHandler(async (req, res) => {
    const interviews = await Interview.find({ user: req.user._id })
      .select("role type status overallScore createdAt")
      .sort({ createdAt: -1 });
    res.json({ interviews });
  })
);

// Get single interview details
router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
    if (!interview) throw new ApiError(404, "Interview session not found");
    res.json({ interview });
  })
);

export default router;
