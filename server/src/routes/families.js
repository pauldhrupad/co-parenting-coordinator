import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { createFamily, getMyFamily, joinFamily } from "../controllers/familyController.js";
import { Family } from "../models/index.js";
import { auditedRoute, responseEntity, stateId } from "../services/audit.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();
router.use(protect);
const familyAudit = (action, controller, loadPrevious) => auditedRoute({
  action,
  entityType: "Family",
  loadPrevious,
  newState: responseEntity("family"),
  entityId: stateId,
  familyId: stateId,
}, controller);
const familyByInvite = (req, session) => Family.findOne({ inviteCode: String(req.params.code).trim().toUpperCase() }).session(session);

router.post("/create", familyAudit("family.created", createFamily));
router.post("/join/:code", familyAudit("family.joined", joinFamily, familyByInvite));
router.get("/me", asyncHandler(getMyFamily));

// Compatibility aliases for the Phase 0 client while it migrates to singular routes.
router.post("/", familyAudit("family.created", createFamily));
router.get("/mine", asyncHandler(getMyFamily));

export default router;
