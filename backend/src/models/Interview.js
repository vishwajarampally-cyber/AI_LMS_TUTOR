import mongoose from "mongoose";

const interviewQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  userAnswer: { type: String, default: "" },
  score: { type: Number, default: 0 },
  feedback: { type: String, default: "" }
});

const interviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, required: true },
    type: { type: String, enum: ["technical", "hr"], required: true },
    status: { type: String, enum: ["in_progress", "completed"], default: "in_progress" },
    questions: [interviewQuestionSchema],
    currentQuestionIndex: { type: Number, default: 0 },
    overallScore: { type: Number, default: 0 },
    strengths: [String],
    weaknesses: [String],
    improvementAreas: { type: String, default: "" }
  },
  { timestamps: true }
);

interviewSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Interview", interviewSchema);
