import { CustodyEvent, Expense } from "../models/index.js";
import { getFamilyForUser } from "../services/family.js";

export async function pendingNotificationCount(req, res) {
  const family = await getFamilyForUser(req.user._id);
  const [pendingSwapCandidates, proposedExpenses] = await Promise.all([
    CustodyEvent.find({ familyId: family._id, status: "pending-swap", requestedBy: { $ne: req.user._id } }).select("originalEvent").populate("originalEvent", "assignedParent"),
    Expense.countDocuments({ familyId: family._id, status: "proposed", proposedBy: { $ne: req.user._id } }),
  ]);
  const pendingSwaps = pendingSwapCandidates.filter((event) => event.originalEvent?.assignedParent?.equals(req.user._id)).length;
  res.json({ success: true, counts: { pendingSwaps, proposedExpenses, total: pendingSwaps + proposedExpenses } });
}

