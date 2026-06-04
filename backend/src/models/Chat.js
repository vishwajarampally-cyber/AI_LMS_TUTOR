import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    citations: [
      {
        materialId: String,
        title: String,
        page: Number,
        chunkId: String,
        score: Number
      }
    ],
    blocked: { type: Boolean, default: false },
    latencyMs: Number
  },
  { timestamps: true }
);

export default mongoose.model("Chat", chatSchema);
