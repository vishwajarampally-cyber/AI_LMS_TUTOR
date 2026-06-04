import { Router } from "express";
import AuditLog from "../models/AuditLog.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("admin", "faculty"),
  asyncHandler(async (_req, res) => {
    const logs = await AuditLog.find().populate("actor", "name email role").sort({ createdAt: -1 }).limit(100);
    res.json({ logs });
  })
);

export default router;
