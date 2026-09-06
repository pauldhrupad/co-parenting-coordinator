import { Router } from "express";
import { AuditLog, CustodyEvent, Expense, MessageLog } from "../models/index.js";
import { requireAuth } from "../middleware/auth.js";
import { getFamilyForUser } from "../services/family.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const family = await getFamilyForUser(req.user._id);
  await family.populate("parents", "name email");
  const now = new Date();
  const [currentEvents, upcomingEvents, pendingExpenses, approvedExpenses, recentMessages, recentAudit] = await Promise.all([
    CustodyEvent.find({ familyId: family._id, status: "confirmed", startDate: { $lte: now }, endDate: { $gte: now } }).populate("assignedParent", "name").sort({ startDate: 1 }),
    CustodyEvent.find({ familyId: family._id, endDate: { $gte: now } }).populate("assignedParent requestedBy", "name").sort({ startDate: 1 }).limit(5),
    Expense.find({ familyId: family._id, status: "proposed" }).populate("paidBy proposedBy", "name").sort({ createdAt: -1 }).limit(5),
    Expense.find({ familyId: family._id, status: "approved" }).lean(),
    MessageLog.find({ familyId: family._id }).populate("senderId", "name").sort({ timestamp: -1 }).limit(4),
    AuditLog.find({ familyId: family._id }).populate("actorId", "name").sort({ timestamp: -1 }).limit(4),
  ]);
  const needsReview = pendingExpenses.filter((item) => !item.proposedBy._id.equals(req.user._id));
  const myParentIndex = family.parents.findIndex((parent) => parent._id.equals(req.user._id));
  const myRatioKey = myParentIndex === 0 ? "parent1" : "parent2";
  const otherRatioKey = myParentIndex === 0 ? "parent2" : "parent1";
  const shareMinor = (item, ratioKey) => Math.round(item.amount * Number(item.splitRatio[ratioKey]) * 100 / 100);
  const owedByMe = approvedExpenses.filter((item) => !item.paidBy.equals(req.user._id)).reduce((sum, item) => sum + shareMinor(item, myRatioKey), 0);
  const owedToMe = approvedExpenses.filter((item) => item.paidBy.equals(req.user._id)).reduce((sum, item) => sum + shareMinor(item, otherRatioKey), 0);
  const pendingExpenseItems = needsReview.map((item) => ({ ...item.toObject({ virtuals: true }), owedAmountMinor: shareMinor(item, myRatioKey) }));
  const activity = [
    ...recentMessages.map((item) => ({ id: item._id, type: item.messageType, actor: item.senderId.displayName, text: item.content, at: item.timestamp })),
    ...recentAudit.map((item) => ({ id: item._id, type: "status-change", actor: item.actorId?.displayName || "System", text: item.action.replaceAll(/[._]/g, " "), at: item.timestamp })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 6);
  res.json({ family, currentEvents, upcomingEvents, pendingExpenses: pendingExpenseItems, summary: { needsReviewCount: needsReview.length, needsReviewMinor: needsReview.reduce((sum, item) => sum + shareMinor(item, myRatioKey), 0), owedByMe, owedToMe, approvedCount: approvedExpenses.length }, activity });
}));

export default router;
