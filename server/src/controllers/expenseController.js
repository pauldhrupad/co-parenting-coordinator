import mongoose from "mongoose";
import { config } from "../config.js";
import { Expense, Family, User } from "../models/index.js";
import { afterCommit } from "../services/audit.js";
import { sendNotificationEmail } from "../services/email.js";
import { nextExpenseState } from "../services/expenseStateMachine.js";
import { AppError } from "../utils/http.js";

const EXPENSE_STATUSES = ["proposed", "approved", "disputed", "settled"];
const POPULATE_FIELDS = "name email";

async function familyForParent(familyId, userId, session = null) {
  if (familyId && !mongoose.isValidObjectId(familyId)) throw new AppError(400, "A valid familyId is required");
  const query = familyId ? Family.findById(familyId) : Family.findOne({ parents: userId });
  if (session) query.session(session);
  const family = await query;
  if (!family) throw new AppError(404, "Family not found");
  if (!family.parents.some((parentId) => parentId.equals(userId))) throw new AppError(403, "You do not have access to this family");
  return family;
}

function assertChild(family, childId) {
  if (!mongoose.isValidObjectId(childId) || !family.children.some((child) => child._id.equals(childId))) throw new AppError(400, "childId must identify a child in this family");
}

function assertParent(family, parentId) {
  if (!mongoose.isValidObjectId(parentId) || !family.parents.some((id) => id.equals(parentId))) throw new AppError(400, "paidBy must identify a parent in this family");
}

function normalizedAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new AppError(400, "Amount must be a positive number");
  if (Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) throw new AppError(400, "Amount can contain at most two decimal places");
  return Math.round(amount * 100) / 100;
}

function normalizedSplit(value = {}) {
  const splitRatio = { parent1: Number(value.parent1 ?? 50), parent2: Number(value.parent2 ?? 50) };
  if (!Number.isFinite(splitRatio.parent1) || !Number.isFinite(splitRatio.parent2) || splitRatio.parent1 < 0 || splitRatio.parent2 < 0 || splitRatio.parent1 > 100 || splitRatio.parent2 > 100 || Math.abs(splitRatio.parent1 + splitRatio.parent2 - 100) > 0.000001) {
    throw new AppError(400, "The parent split percentages must sum to 100");
  }
  return splitRatio;
}

async function loadExpense(id, userId, session = null) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, "A valid expense id is required");
  const query = Expense.findById(id);
  if (session) query.session(session);
  const expense = await query;
  if (!expense) throw new AppError(404, "Expense not found");
  const family = await familyForParent(expense.familyId, userId, session);
  return { family, expense };
}

async function populateExpense(expense) {
  return expense.populate("paidBy proposedBy approvals.parentId resolvedBy settledBy", POPULATE_FIELDS);
}

export async function createExpense(req, res) {
  const session = req.dbSession;
  const family = await familyForParent(req.body.familyId, req.user._id, session);
  if (family.parents.length !== 2) throw new AppError(409, "A second parent must join the family before expenses can be proposed");
  assertChild(family, req.body.childId);
  const paidBy = req.body.paidBy || req.user._id;
  assertParent(family, paidBy);
  const amount = normalizedAmount(req.body.amount);
  const splitRatio = normalizedSplit(req.body.splitRatio);
  const title = String(req.body.title || "").trim();
  if (title.length < 2) throw new AppError(400, "Expense title must contain at least two characters");
  const receiptUrl = req.body.receiptUrl ? String(req.body.receiptUrl).trim() : null;
  if (receiptUrl && !receiptUrl.startsWith("https://")) throw new AppError(400, "receiptUrl must be a secure HTTPS URL");

  const [expense] = await Expense.create([{
    familyId: family._id,
    childId: req.body.childId,
    title,
    amount,
    paidBy,
    proposedBy: req.user._id,
    splitRatio,
    receiptUrl,
    status: "proposed",
    approvals: [],
  }], { session });

  const recipientId = family.parents.find((parentId) => !parentId.equals(req.user._id));
  const recipient = await User.findById(recipientId).session(session).select("name email");
  afterCommit(req, () => sendNotificationEmail(recipient?.email, "New expense proposed", "newExpenseProposed", {
    recipientName: recipient?.displayName,
    actorName: req.user.displayName,
    expenseTitle: title,
    amount: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount),
    familyName: family.name,
    actionUrl: `${config.clientUrl}/expenses`,
  }));
  res.status(201).json({ success: true, expense: await populateExpense(expense) });
}

export async function listExpenses(req, res) {
  const family = await familyForParent(req.params.familyId, req.user._id);
  const filter = { familyId: family._id };
  if (req.query.childId) {
    assertChild(family, req.query.childId);
    filter.childId = req.query.childId;
  }
  if (req.query.status) {
    if (!EXPENSE_STATUSES.includes(req.query.status)) throw new AppError(400, "Invalid expense status filter");
    filter.status = req.query.status;
  }
  const expenses = await Expense.find(filter).sort({ createdAt: -1, _id: -1 }).populate("paidBy proposedBy approvals.parentId resolvedBy settledBy", POPULATE_FIELDS);
  res.json({ success: true, expenses });
}

async function reviewExpense(req, res, action) {
  const note = String(req.body?.note || "").trim();

  const session = req.dbSession;
  const { family, expense } = await loadExpense(req.params.id, req.user._id, session);
  const nextState = nextExpenseState(expense, action, { actorId: req.user._id, note });
  expense.approvals.push({ parentId: req.user._id, action, timestamp: new Date(), note });
  expense.status = nextState;
  await expense.save({ session });

  if (action === "dispute") {
    const recipient = await User.findById(expense.proposedBy).session(session).select("name email");
    afterCommit(req, () => sendNotificationEmail(recipient?.email, "Expense disputed", "expenseDisputed", {
      recipientName: recipient?.displayName,
      actorName: req.user.displayName,
      expenseTitle: expense.title,
      reason: note,
      familyName: family.name,
      actionUrl: `${config.clientUrl}/expenses`,
    }));
  }
  res.json({ success: true, expense: await populateExpense(expense) });
}

export function approveExpense(req, res) { return reviewExpense(req, res, "approve"); }
export function disputeExpense(req, res) { return reviewExpense(req, res, "dispute"); }

export async function settleExpense(req, res) {
  const resolutionNote = String(req.body?.resolutionNote || "").trim();
  const session = req.dbSession;
  const { family, expense } = await loadExpense(req.params.id, req.user._id, session);
  const nextState = nextExpenseState(expense, "settle", { actorId: req.user._id, resolutionNote });

  if (expense.status === "disputed") {
    expense.resolutionNote = resolutionNote;
    expense.resolvedBy = req.user._id;
    expense.resolvedAt = new Date();
  }
  expense.status = nextState;
  expense.settledBy = req.user._id;
  expense.settledAt = new Date();
  await expense.save({ session });

  res.json({ success: true, expense: await populateExpense(expense) });
}

export async function expenseSummary(req, res) {
  const family = await familyForParent(req.params.familyId, req.user._id);
  if (family.parents.length !== 2) throw new AppError(409, "A second parent must join before a balance can be calculated");
  const [parent1, parent2] = family.parents;

  // Proposed and disputed values are excluded because the second parent has not
  // accepted them; including contested amounts would make the balance misleading.
  const [aggregated = { perChild: [], perMonth: [], balance: [] }] = await Expense.aggregate([
    { $match: { familyId: family._id, status: { $in: ["approved", "settled"] } } },
    { $facet: {
      perChild: [
        { $group: { _id: "$childId", totalSpent: { $sum: "$amount" }, expenseCount: { $sum: 1 } } },
        { $project: { _id: 0, childId: "$_id", totalSpent: { $round: ["$totalSpent", 2] }, expenseCount: 1 } },
        { $sort: { totalSpent: -1 } },
      ],
      perMonth: [
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: "UTC" } }, totalSpent: { $sum: "$amount" }, expenseCount: { $sum: 1 } } },
        { $project: { _id: 0, month: "$_id", totalSpent: { $round: ["$totalSpent", 2] }, expenseCount: 1 } },
        { $sort: { month: -1 } },
      ],
      balance: [
        { $group: { _id: null, totalSpent: { $sum: "$amount" }, netForParent1: { $sum: { $cond: [
          { $eq: ["$paidBy", parent1] },
          { $multiply: ["$amount", { $divide: ["$splitRatio.parent2", 100] }] },
          { $multiply: [-1, "$amount", { $divide: ["$splitRatio.parent1", 100] }] },
        ] } } } },
        { $project: { _id: 0, totalSpent: { $round: ["$totalSpent", 2] }, netForParent1: { $round: ["$netForParent1", 2] } } },
      ],
    } },
  ]);

  const familyObject = family.toObject();
  const nameByChild = new Map(familyObject.children.map((child) => [String(child._id), child.fullName]));
  const balance = aggregated.balance[0] || { totalSpent: 0, netForParent1: 0 };
  const net = balance.netForParent1;
  const netBalance = net === 0 ? { amount: 0, creditorId: null, debtorId: null } : {
    amount: Math.abs(net),
    creditorId: String(net > 0 ? parent1 : parent2),
    debtorId: String(net > 0 ? parent2 : parent1),
  };

  res.json({
    success: true,
    summary: {
      recognizedStatuses: ["approved", "settled"],
      totalSpent: balance.totalSpent,
      perChild: aggregated.perChild.map((row) => ({ ...row, childId: String(row.childId), childName: nameByChild.get(String(row.childId)) || "Child" })),
      perMonth: aggregated.perMonth,
      netBalance,
    },
  });
}
