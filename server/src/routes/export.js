import { Router } from "express";
import { exportFamilyHistory } from "../controllers/exportController.js";
import { protect } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();
router.get("/:familyId", protect, asyncHandler(exportFamilyHistory));
export default router;
