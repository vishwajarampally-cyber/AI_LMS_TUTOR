import mongoose from "mongoose";

const resumeAnalysisSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetRole: { type: String, required: true },
    targetDescription: { type: String, required: true },
    fileName: { type: String, required: true },
    atsScore: { type: Number, required: true },
    analysis: {
      missingSkills: [String],
      missingKeywords: [String],
      suggestions: [String],
      sectionFeedback: {
        summary: String,
        experience: String,
        skills: String,
        education: String
      }
    },
    improvedResume: { type: String, required: true }
  },
  { timestamps: true }
);

resumeAnalysisSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("ResumeAnalysis", resumeAnalysisSchema);
