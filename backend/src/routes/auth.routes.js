import { Router } from "express";
import { body } from "express-validator";
import crypto from "node:crypto";
import dns from "node:dns";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { signToken } from "../utils/tokens.js";
import { writeAudit } from "../utils/audit.js";
import { loginLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";

const router = Router();

async function checkEmailDomain(email) {
  const domain = email.split("@")[1];
  if (!domain) return false;
  try {
    const mx = await dns.promises.resolveMx(domain);
    return mx && mx.length > 0;
  } catch (err) {
    if (err.code === "ENOTFOUND" || err.code === "ENODATA") {
      return false;
    }
    console.warn(`DNS check for domain ${domain} failed: ${err.message}`);
    return true;
  }
}

router.post(
  "/register",
  [
    body("name").trim().isLength({ min: 2 }),
    body("email")
      .trim()
      .isEmail()
      .withMessage("Enter a valid email address")
      .normalizeEmail()
      .custom(async (value) => {
        const isValid = await checkEmailDomain(value);
        if (!isValid) {
          throw new Error("Email domain does not exist or cannot receive mail");
        }
        return true;
      }),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("role").optional().isIn(["student", "faculty", "admin"]).withMessage("Select a valid role")
  ],
  validate,
  asyncHandler(async (req, res) => {
    const exists = await User.exists({ email: req.body.email });
    if (exists) throw new ApiError(409, "Email already registered");
    if (req.body.role === "admin" && (await User.exists({ role: "admin" }))) {
      throw new ApiError(403, "Admin registration is restricted");
    }
    const user = await User.create(req.body);
    await writeAudit(req, "REGISTER", "User", user._id, { email: user.email, role: user.role });
    res.status(201).json({ token: signToken(user), user: { ...user.toObject(), password: undefined } });
  })
);
router.post(
  "/login",
  loginLimiter,
  [body("email").trim().isEmail().withMessage("Enter a valid email address").normalizeEmail(), body("password").notEmpty().withMessage("Password is required")],
  validate,
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).select("+password");
    if (!user || !(await user.comparePassword(req.body.password))) throw new ApiError(401, "Invalid credentials");
    user.lastLoginAt = new Date();
    await user.save();
    await writeAudit(req, "LOGIN", "User", user._id, { email: user.email, role: user.role });
    res.json({ token: signToken(user), user: { ...user.toObject(), password: undefined } });
  })
);

router.post(
  "/forgot-password",
  [body("email").trim().isEmail().withMessage("Enter a valid email address").normalizeEmail()],
  validate,
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).select("+passwordResetToken +passwordResetExpires");
    const demoResetToken = crypto.randomBytes(24).toString("hex");
    if (user) {
      user.passwordResetToken = crypto.createHash("sha256").update(demoResetToken).digest("hex");
      user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
      await writeAudit(req, "FORGOT_PASSWORD", "User", user._id, { email: user.email });
    }

    res.json({
      message: "If an account exists for this email, a reset token has been generated.",
      resetToken: process.env.NODE_ENV === "production" ? undefined : user ? demoResetToken : undefined
    });
  })
);

router.post(
  "/reset-password",
  [
    body("token").trim().notEmpty().withMessage("Reset token is required"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
  ],
  validate,
  asyncHandler(async (req, res) => {
    const hashedToken = crypto.createHash("sha256").update(req.body.token).digest("hex");
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    }).select("+passwordResetToken +passwordResetExpires +password");

    if (!user) throw new ApiError(400, "Reset token is invalid or expired");

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    await writeAudit(req, "RESET_PASSWORD", "User", user._id, { email: user.email });
    res.json({ message: "Password reset successful. You can now login." });
  })
);

export default router;
