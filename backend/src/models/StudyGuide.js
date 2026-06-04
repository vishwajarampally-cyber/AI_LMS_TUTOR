import mongoose from "mongoose";

const studyGuideSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    topic: { type: String, required: true },
    type: { type: String, enum: ["notes", "qa"], required: true },
    content: { type: String, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("StudyGuide", studyGuideSchema);
