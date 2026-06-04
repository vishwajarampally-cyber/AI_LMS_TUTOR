import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    metricType: {
      type: String,
      enum: ["accuracy", "relevance", "faithfulness", "hallucination_rate", "latency", "cost", "feedback_score", "usage"],
      required: true
    },
    value: { type: Number, required: true },
    metadata: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

analyticsSchema.index({ metricType: 1, createdAt: -1 });

export default mongoose.model("Analytics", analyticsSchema);
