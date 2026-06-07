import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ["student", "ai"], required: true },
  text: { type: String, required: true },
  sourceTitles: [String],
  language: { type: String, default: "English" },
  createdAt: { type: Date, default: Date.now }
});

const chatSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    title: { type: String, required: true },
    isBookmarked: { type: Boolean, default: false, index: true },
    messages: [messageSchema]
  },
  { timestamps: true }
);

// Create compound index for fast query of user's bookmarked sessions sorted by date
chatSessionSchema.index({ user: 1, isBookmarked: 1, updatedAt: -1 });
// Create index for search queries on title and message text
chatSessionSchema.index({ title: "text", "messages.text": "text" });

export default mongoose.model("ChatSession", chatSessionSchema);
