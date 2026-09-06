import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { uploadImageBuffer } from "../config/cloudinary.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError, asyncHandler } from "../utils/http.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } });
const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    if (!file.mimetype.startsWith("image/")) return callback(new AppError(400, "Receipt must be an image file"));
    return callback(null, true);
  },
});

router.post("/receipt", requireAuth, receiptUpload.single("receipt"), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, "A receipt image is required");
  const result = await uploadImageBuffer(req.file.buffer);
  res.status(201).json({
    success: true,
    receiptUrl: result.secure_url,
    asset: { url: result.secure_url, publicId: result.public_id, originalName: req.file.originalname, resourceType: "image" },
  });
}));

router.post("/", requireAuth, upload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, "A file is required");
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) throw new AppError(503, "File storage is not configured");
  cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
  const resourceType = req.file.mimetype.startsWith("image/") ? "image" : "raw";
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ resource_type: resourceType, folder: "coparent" }, (error, value) => error ? reject(error) : resolve(value));
    stream.end(req.file.buffer);
  });
  res.status(201).json({ asset: { url: result.secure_url, publicId: result.public_id, originalName: req.file.originalname, resourceType } });
}));

export default router;
