import mongoose from "mongoose";

export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, _req, res, _next) {
  if (error.code === "LIMIT_FILE_SIZE") return res.status(413).json({ success: false, message: "Receipt image must be 8 MB or smaller" });
  if (error.code === "LIMIT_UNEXPECTED_FILE") return res.status(400).json({ success: false, message: "Use the receipt field and upload one image only" });
  if (error.code === 11000) return res.status(409).json({ success: false, message: "That value is already in use", fields: error.keyValue });
  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ success: false, message: "Validation failed", fields: Object.fromEntries(Object.entries(error.errors).map(([key, value]) => [key, value.message])) });
  }
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  const hideInternalDetails = status >= 500 && process.env.NODE_ENV === "production";
  res.status(status).json({ success: false, message: hideInternalDetails ? "Something went wrong" : error.message, details: error.details });
}
