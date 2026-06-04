import mongoose from "mongoose";

const studyPlanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    weakTopics: [String],
    strongTopics: [String],
    dailyPlan: [String],
    weeklyPlan: [String],
    examPreparationPlan: [String],
    generatedBy: { type: String, default: "study_planner_agent" }
  },
  { timestamps: true }
);

export default mongoose.model("StudyPlan", studyPlanSchema);
