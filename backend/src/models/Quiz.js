import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["mcq", "true_false", "fill_blank", "msq", "short_answer", "long_answer"],
      required: true
    },
    prompt: { type: String, required: true },
    options: [String],
    answer: String,
    rubric: String,
    topic: String,
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" }
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: String,
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    questions: [questionSchema]
  },
  { timestamps: true }
);

export default mongoose.model("Quiz", quizSchema);
