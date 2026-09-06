import { Router } from "express";
import { pendingNotificationCount } from "../controllers/notificationController.js";
import { protect } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();
router.get("/pending-count", protect, asyncHandler(pendingNotificationCount));
export default router;
