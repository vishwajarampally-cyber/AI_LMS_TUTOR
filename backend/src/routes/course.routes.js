import fs from "fs/promises";
import { Router } from "express";
import { body } from "express-validator";
import Course from "../models/Course.js";
import Material from "../models/Material.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../utils/audit.js";
import { ApiError } from "../utils/apiError.js";
import { deleteMaterialVectors } from "../rag/vectorStore.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const query = req.user.role === "student" ? { status: "active" } : req.user.role === "faculty" ? { faculty: req.user._id } : {};
    const courses = await Course.find(query).populate("faculty", "name email").sort({ createdAt: -1 });
    res.json({ courses });
  })
);

router.post(
  "/",
  authenticate,
  authorize("faculty", "admin"),
  [body("title").trim().notEmpty(), body("code").trim().notEmpty(), body("topics").optional().isArray()],
  validate,
  asyncHandler(async (req, res) => {
    const course = await Course.create({ ...req.body, faculty: req.body.faculty || req.user._id });
    await writeAudit(req, "CREATE_COURSE", "Course", course._id, { title: course.title });
    res.status(201).json({ course });
  })
);

router.delete(
  "/:courseId",
  authenticate,
  authorize("faculty", "admin"),
  asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.courseId);
    if (!course) throw new ApiError(404, "Course not found");

    if (req.user.role === "faculty" && String(course.faculty) !== String(req.user._id)) {
      throw new ApiError(403, "You do not have permission to delete this course");
    }

    const materials = await Material.find({ course: course._id });

    for (const material of materials) {
      const namespace = material.pineconeNamespace || `course-${course._id}`;
      try {
        await deleteMaterialVectors({
          namespace,
          materialId: material._id,
          chunkCount: material.chunkCount || 0
        });
      } catch (error) {
        console.warn(`Pinecone delete warning for material ${material._id} in course ${course._id}: ${error.message}`);
      }

      if (material.storagePath) {
        await fs.unlink(material.storagePath).catch(() => {});
      }
    }

    await Material.deleteMany({ course: course._id });
    await Course.findByIdAndDelete(course._id);

    await writeAudit(req, "DELETE_COURSE", "Course", course._id, {
      title: course.title,
      code: course.code
    });

    res.json({ message: "Course and all associated materials deleted successfully", courseId: course._id });
  })
);

export default router;
