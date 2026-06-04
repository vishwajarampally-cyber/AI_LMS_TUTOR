import { Router } from "express";
import User from "../models/User.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/me", authenticate, (req, res) => res.json({ user: req.user }));

router.get(
  "/",
  authenticate,
  authorize("admin"),
  asyncHandler(async (_req, res) => {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users });
  })
);

export default router;
