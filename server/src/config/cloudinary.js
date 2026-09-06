import { v2 as cloudinary } from "cloudinary";
import { config } from "../config.js";
import { AppError } from "../utils/http.js";

export function cloudinaryIsConfigured() {
  return Boolean(config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret);
}

export async function uploadImageBuffer(buffer, { folder = "coparent/receipts" } = {}) {
  if (!cloudinaryIsConfigured()) throw new AppError(503, "Receipt storage is not configured");

  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image", folder, transformation: [{ quality: "auto", fetch_format: "auto" }] },
      (error, result) => error ? reject(error) : resolve(result),
    );
    stream.end(buffer);
  });
}
