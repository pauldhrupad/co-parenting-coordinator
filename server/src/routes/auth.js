import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { deactivateAccount, login, me, register, updateProfile } from "../controllers/authController.js";
import { User } from "../models/index.js";
import { auditedRoute, responseEntity, stateId } from "../services/audit.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();
router.post("/register", auditedRoute({ action: "user.registered", entityType: "User", newState: responseEntity("user"), entityId: stateId, familyId: null, actorId: ({ newState }) => newState.id }, register));
router.post("/login", asyncHandler(login));
router.get("/me", protect, asyncHandler(me));
router.patch("/me", protect, auditedRoute({
  action: "user.profile_updated",
  entityType: "User",
  loadPrevious: (req, session) => User.findById(req.user._id).session(session),
  newState: responseEntity("user"),
  entityId: stateId,
  familyId: ({ req }) => req.accountFamilyId || null,
}, updateProfile));
router.delete("/me", protect, auditedRoute({
  action: "user.deactivated",
  entityType: "User",
  loadPrevious: (req, session) => User.findById(req.user._id).session(session),
  newState: responseEntity("user"),
  entityId: stateId,
  familyId: ({ req }) => req.accountFamilyId || null,
}, deactivateAccount));

export default router;
