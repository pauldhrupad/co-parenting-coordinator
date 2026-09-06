import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { login, me, register } from "../controllers/authController.js";
import { auditedRoute, responseEntity, stateId } from "../services/audit.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();
router.post("/register", auditedRoute({ action: "user.registered", entityType: "User", newState: responseEntity("user"), entityId: stateId, familyId: null, actorId: ({ newState }) => newState.id }, register));
router.post("/login", asyncHandler(login));
router.get("/me", protect, asyncHandler(me));

export default router;
