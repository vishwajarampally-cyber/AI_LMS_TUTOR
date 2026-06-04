import { validationResult } from "express-validator";
import { ApiError } from "../utils/apiError.js";

export function validate(req, _res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const details = result.array();
    const message = details.map((item) => item.msg).join(", ") || "Validation failed";
    throw new ApiError(400, message, details);
  }
  next();
}
