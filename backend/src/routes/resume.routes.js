import { Router } from "express";
import multer from "multer";
import fs from "fs/promises";
import ResumeAnalysis from "../models/ResumeAnalysis.js";
import { authenticate } from "../middleware/auth.js";
import { extractText } from "../rag/documentLoader.js";
import { analyzeResume } from "../agents/resumeAgent.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { writeAudit } from "../utils/audit.js";

const router = Router();
const allowedResumeTypes = new Set([".pdf", ".docx"]);
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 20) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.slice(file.originalname.lastIndexOf(".")).toLowerCase();
    if (!allowedResumeTypes.has(ext)) return cb(new ApiError(400, "Only PDF and DOCX resume files are supported"));
    cb(null, true);
  }
});

// Analyze a uploaded resume file
router.post(
  "/analyze",
  authenticate,
  upload.single("resume"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "Resume file is required");
    const { targetRole, targetDescription } = req.body;
    
    if (!targetRole || !targetDescription) {
      await fs.unlink(req.file.path).catch(() => {});
      throw new ApiError(400, "Target job role and description are required");
    }

    let resumeText = "";
    try {
      resumeText = await extractText(req.file.path, req.file.originalname);
    } catch (err) {
      await fs.unlink(req.file.path).catch(() => {});
      throw new ApiError(400, `Failed to parse document: ${err.message}`);
    }

    let results;
    try {
      results = await analyzeResume({
        resumeText,
        targetRole,
        targetDescription
      });
    } catch (err) {
      throw new ApiError(500, `AI Resume Analysis failed: ${err.message}`);
    } finally {
      await fs.unlink(req.file.path).catch(() => {});
    }

    const analysisRecord = await ResumeAnalysis.create({
      user: req.user._id,
      targetRole,
      targetDescription,
      fileName: req.file.originalname,
      atsScore: results.atsScore || 60,
      analysis: {
        missingSkills: results.missingSkills || [],
        missingKeywords: results.missingKeywords || [],
        suggestions: results.suggestions || [],
        sectionFeedback: results.sectionFeedback || {}
      },
      improvedResume: results.improvedResume || ""
    });

    await writeAudit(req, "ANALYZE_RESUME", "ResumeAnalysis", analysisRecord._id, { targetRole });

    res.status(201).json({ analysis: analysisRecord });
  })
);

// Get past analysis history
router.get(
  "/history",
  authenticate,
  asyncHandler(async (req, res) => {
    const records = await ResumeAnalysis.find({ user: req.user._id })
      .select("targetRole fileName atsScore createdAt")
      .sort({ createdAt: -1 });
    res.json({ history: records });
  })
);

// Get individual analysis record details
router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const record = await ResumeAnalysis.findOne({ _id: req.params.id, user: req.user._id });
    if (!record) throw new ApiError(404, "Resume analysis not found");
    res.json({ analysis: record });
  })
);

// Download optimized markdown resume
router.get(
  "/:id/download",
  authenticate,
  asyncHandler(async (req, res) => {
    const record = await ResumeAnalysis.findOne({ _id: req.params.id, user: req.user._id });
    if (!record) throw new ApiError(404, "Resume analysis not found");

    const sanitizedRole = record.targetRole.replace(/[^a-z0-9]/gi, "_");
    res.setHeader("Content-Disposition", `attachment; filename=Tailored_Resume_${sanitizedRole}.md`);
    res.setHeader("Content-Type", "text/markdown");
    res.send(record.improvedResume);
  })
);

export default router;
