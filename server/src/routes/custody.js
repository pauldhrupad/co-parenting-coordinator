import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { createCustodyEvent, deleteCustodyEvent, listCustodyEvents, requestCustodySwap, respondToCustodySwap, updateCustodyEvent } from "../controllers/custodyController.js";
import { CustodyEvent } from "../models/index.js";
import { auditedRoute, responseEntity, stateFamilyId, stateId } from "../services/audit.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();
router.use(protect);
const loadEvent = (req, session) => CustodyEvent.findById(req.params.id).session(session);
const custodyAudit = (action, controller, { loadPrevious, newState = responseEntity("event") } = {}) => auditedRoute({
  action,
  entityType: "CustodyEvent",
  loadPrevious,
  newState,
  entityId: stateId,
  familyId: stateFamilyId,
}, controller);

router.post("/", custodyAudit("custody.created", createCustodyEvent));
router.get("/", asyncHandler(listCustodyEvents));
router.get("/:familyId", asyncHandler(listCustodyEvents));
router.patch("/:id", custodyAudit("custody.updated", updateCustodyEvent, { loadPrevious: loadEvent }));
router.delete("/:id", custodyAudit("custody.deleted", deleteCustodyEvent, { loadPrevious: loadEvent, newState: null }));
router.post("/:id/swap-request", custodyAudit("custody.swap_requested", requestCustodySwap));
router.patch("/:id/respond", custodyAudit(({ req }) => String(req.body.action).toLowerCase() === "accept" ? "custody.swap_accepted" : "custody.swap_rejected", respondToCustodySwap, { loadPrevious: loadEvent, newState: ({ responseBody }) => responseBody.event || null }));
// Temporary aliases keep the Phase 1 calendar client working while it migrates to the Phase 2 route names.
router.post("/:id/swap", custodyAudit("custody.swap_requested", requestCustodySwap));
router.post("/:id/respond", custodyAudit(({ req }) => String(req.body.action).toLowerCase() === "accept" ? "custody.swap_accepted" : "custody.swap_rejected", respondToCustodySwap, { loadPrevious: loadEvent, newState: ({ responseBody }) => responseBody.event || null }));

export default router;
