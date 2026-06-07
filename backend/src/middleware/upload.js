import fs from "fs";
import os from "os";
import path from "path";
import multer from "multer";
import { ApiError } from "../utils/apiError.js";

const allowed = new Set([".pdf", ".docx", ".ppt", ".pptx"]);
const maxSize = Number(process.env.MAX_UPLOAD_MB || 100) * 1024 * 1024;
const maxFiles = Number(process.env.MAX_UPLOAD_FILES || 20);

const uploadDirectory = process.env.UPLOAD_DIR || (process.env.VERCEL ? path.join(os.tmpdir(), "uploads") : path.join(process.cwd(), "uploads"));
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDirectory),
  filename: (_req, file, cb) => {
    const safeBase = path.basename(file.originalname).replace(/[^a-z0-9._-]/gi, "_");
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: maxSize },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.has(ext)) return cb(new ApiError(400, "Only PDF, DOCX, PPT, and PPTX files are supported"));
    cb(null, true);
  }
});

export const uploadMaterial = upload.array("files", maxFiles);
