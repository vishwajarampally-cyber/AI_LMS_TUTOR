import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    description: String,
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    topics: [String],
    status: { type: String, enum: ["draft", "active", "archived"], default: "active" }
  },
  { timestamps: true }
);

courseSchema.index({ title: "text", code: "text", description: "text" });

export default mongoose.model("Course", courseSchema);
