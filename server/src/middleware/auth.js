import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { User } from "../models/index.js";
import { AppError, asyncHandler } from "../utils/http.js";

export const protect = asyncHandler(async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) throw new AppError(401, "Authentication required");
  let payload;
  try { payload = jwt.verify(token, config.jwtSecret); } catch { throw new AppError(401, "Invalid or expired token"); }
  const user = await User.findById(payload.sub);
  if (!user?.isActive) throw new AppError(401, "Account is unavailable");
  req.user = user;
  next();
});

export const requireAuth = protect;
