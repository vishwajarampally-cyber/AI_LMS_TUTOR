import mongoose from "mongoose";

const materialSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    originalName: String,
    fileType: { type: String, enum: ["pdf", "docx", "ppt", "pptx"], required: true },
    fileSize: Number,
    storagePath: String,
    chunkCount: { type: Number, default: 0 },
    pineconeNamespace: String,
    status: { type: String, enum: ["processing", "indexed", "failed"], default: "processing" },
    error: String
  },
  { timestamps: true }
);

export default mongoose.model("Material", materialSchema);
