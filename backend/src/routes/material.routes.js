import fs from "fs/promises";
import path from "path";
import { Router } from "express";
import { body } from "express-validator";
import Course from "../models/Course.js";
import Material from "../models/Material.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { uploadMaterial } from "../middleware/upload.js";
import { uploadLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { scheduleMaterialIndexing } from "../rag/backgroundIndex.js";
import { deleteMaterialVectors } from "../rag/vectorStore.js";
import { writeAudit } from "../utils/audit.js";

const router = Router();

function parseTitles(raw, fileCount) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(raw)
      .split("|")
      .map((title) => title.trim())
      .filter(Boolean)
      .slice(0, fileCount);
  }
}

router.post(
  "/upload",
  authenticate,
  authorize("faculty", "admin"),
  uploadLimiter,
  uploadMaterial,
  [body("courseId").notEmpty()],
  validate,
  asyncHandler(async (req, res) => {
    const files = req.files || [];
    if (!files.length) throw new ApiError(400, "At least one file is required");

    const course = await Course.findById(req.body.courseId);
    if (!course) throw new ApiError(404, "Course not found");

    const titles = parseTitles(req.body.titles, files.length);
    const materials = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const material = await Material.create({
        course: course._id,
        uploadedBy: req.user._id,
        title: titles[i] || path.basename(file.originalname, path.extname(file.originalname)),
        originalName: file.originalname,
        fileType: path.extname(file.originalname).replace(".", "").toLowerCase(),
        fileSize: file.size,
        storagePath: file.path,
        pineconeNamespace: `course-${course._id}`,
        status: "processing"
      });

      scheduleMaterialIndexing(material, course);
      materials.push(material);
      await writeAudit(req, "UPLOAD_MATERIAL", "Material", material._id, {
        course: course._id,
        title: material.title
      });
    }

    res.status(202).json({
      message: `${materials.length} file(s) uploaded. Indexing continues in the background.`,
      materials
    });
  })
);

router.get(
  "/course/:courseId",
  authenticate,
  asyncHandler(async (req, res) => {
    const materials = await Material.find({ course: req.params.courseId }).sort({ createdAt: -1 });
    res.json({ materials });
  })
);

router.delete(
  "/:materialId",
  authenticate,
  authorize("faculty", "admin"),
  asyncHandler(async (req, res) => {
    const material = await Material.findById(req.params.materialId);
    if (!material) throw new ApiError(404, "Material not found");

    const namespace = material.pineconeNamespace || `course-${material.course}`;

    try {
      await deleteMaterialVectors({
        namespace,
        materialId: material._id,
        chunkCount: material.chunkCount || 0
      });
    } catch (error) {
      console.warn(`Pinecone delete warning for ${material._id}: ${error.message}`);
    }

    if (material.storagePath) {
      await fs.unlink(material.storagePath).catch(() => {});
    }

    await Material.findByIdAndDelete(material._id);
    await writeAudit(req, "DELETE_MATERIAL", "Material", material._id, {
      course: material.course,
      title: material.title
    });

    res.json({ message: "Material deleted", materialId: material._id });
  })
);

export default router;
