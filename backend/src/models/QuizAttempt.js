import mongoose from "mongoose";

const quizAttemptSchema = new mongoose.Schema(
  {
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    answers: [
      {
        prompt: String,
        answer: String,
        expected: String,
        score: Number,
        feedback: String,
        topic: String
      }
    ],
    totalScore: { type: Number, default: 0 },
    nextDifficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" }
  },
  { timestamps: true }
);

export default mongoose.model("QuizAttempt", quizAttemptSchema);
