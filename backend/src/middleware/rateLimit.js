import rateLimit from "express-rate-limit";

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_LIMIT_PER_15_MIN || 8),
  message: { message: "Too many login attempts. Please try again later." }
});

export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AI_REQUEST_LIMIT_PER_15_MIN || 40),
  message: { message: "AI request limit reached. Please slow down." }
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.UPLOAD_LIMIT_PER_HOUR || 80),
  message: { message: "Upload limit reached. Please try again later." }
});
