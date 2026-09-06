import { Router } from "express";
import { approveExpense, createExpense, disputeExpense, expenseSummary, listExpenses, settleExpense } from "../controllers/expenseController.js";
import { Expense } from "../models/index.js";
import { auditedRoute, responseEntity, stateFamilyId, stateId } from "../services/audit.js";
import { protect } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();
router.use(protect);

const expenseAudit = (action, controller, loadPrevious) => auditedRoute({
  action,
  entityType: "Expense",
  loadPrevious,
  newState: responseEntity("expense"),
  entityId: stateId,
  familyId: stateFamilyId,
}, controller);
const loadExpense = (req, session) => Expense.findById(req.params.id).session(session);

router.post("/", expenseAudit("expense.proposed", createExpense));
router.get("/", asyncHandler(listExpenses)); // Phase 1 client compatibility: resolves the signed-in user's family.
router.get("/:familyId/summary", asyncHandler(expenseSummary));
router.get("/:familyId", asyncHandler(listExpenses));
router.patch("/:id/approve", expenseAudit("expense.approved", approveExpense, loadExpense));
router.patch("/:id/dispute", expenseAudit("expense.disputed", disputeExpense, loadExpense));
router.patch("/:id/settle", expenseAudit(({ previousState }) => previousState?.status === "disputed" ? "expense.dispute_resolved" : "expense.settled", settleExpense, loadExpense));

export default router;
