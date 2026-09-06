import { Router } from "express";
import { listAuditTrail } from "../controllers/auditController.js";
import { protect } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();
router.use(protect);
router.get("/:familyId", asyncHandler(listAuditTrail));

// There are intentionally no POST, PATCH, PUT, or DELETE audit routes. Omitting
// mutation endpoints makes the append-only contract enforceable outside the UI.

export default router;
