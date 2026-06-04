import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetType: { type: String, enum: ["chat", "quiz", "evaluation", "study_plan"], required: true },
    targetId: String,
    score: { type: Number, min: 1, max: 5, required: true },
    comment: String
  },
  { timestamps: true }
);

export default mongoose.model("Feedback", feedbackSchema);
