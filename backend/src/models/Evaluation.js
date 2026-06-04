import mongoose from "mongoose";

const evaluationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    question: String,
    answer: String,
    correctness: Number,
    completeness: Number,
    relevance: Number,
    coverage: Number,
    score: Number,
    feedback: String,
    missingConcepts: [String],
    suggestedImprovements: [String],
    latencyMs: Number
  },
  { timestamps: true }
);

export default mongoose.model("Evaluation", evaluationSchema);
