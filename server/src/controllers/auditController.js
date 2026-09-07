import mongoose from "mongoose";
import { AuditLog, Family } from "../models/index.js";
import { AppError } from "../utils/http.js";

const ACTION_TEXT = {
  "user.registered": "created a parent account",
  "user.deactivated": "deactivated their account",
  "family.created": "created the family space",
  "family.joined": "joined the family space",
  "message.sent": "sent a family message",
  "expense.proposed": "proposed an expense",
  "expense.approved": "approved an expense",
  "expense.disputed": "disputed an expense",
  "expense.settled": "settled an expense",
  "expense.dispute_resolved": "resolved and settled a disputed expense",
  "custody.created": "created a custody event",
  "custody.updated": "updated a custody event",
  "custody.deleted": "deleted a custody event",
  "custody.swap_requested": "requested a custody swap",
  "custody.swap_accepted": "accepted a custody swap",
  "custody.swap_rejected": "rejected a custody swap",
};

function quotedSubject(entry) {
  const state = entry.newState || entry.previousState || {};
  if (entry.entityType === "Expense" && state.title) return ` '${state.title}'`;
  if (entry.entityType === "MessageLog" && state.messageType === "decision") return " and recorded it as a decision";
  return "";
}

export function descriptionFor(entry) {
  const actor = entry.actorId?.displayName || entry.actorId?.name || "System";
  const actionText = ACTION_TEXT[entry.action] || entry.action.replaceAll(/[._]/g, " ");
  return `${actor} ${actionText}${quotedSubject(entry)}`;
}

function decodeCursor(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const timestamp = new Date(parsed.timestamp);
    if (Number.isNaN(timestamp.getTime()) || !mongoose.isValidObjectId(parsed.id)) throw new Error();
    return { timestamp, id: new mongoose.Types.ObjectId(parsed.id) };
  } catch {
    throw new AppError(400, "Invalid audit cursor");
  }
}

function encodeCursor(entry) {
  return Buffer.from(JSON.stringify({ timestamp: entry.timestamp, id: entry._id })).toString("base64url");
}

export async function listAuditTrail(req, res) {
  if (!mongoose.isValidObjectId(req.params.familyId)) throw new AppError(400, "A valid familyId is required");
  const family = await Family.findById(req.params.familyId);
  if (!family) throw new AppError(404, "Family not found");
  if (!family.parents.some((id) => id.equals(req.user._id))) throw new AppError(403, "You do not have access to this family");

  const cursor = decodeCursor(req.query.cursor);
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const filter = { familyId: family._id };
  if (cursor) filter.$or = [
    { timestamp: { $lt: cursor.timestamp } },
    { timestamp: cursor.timestamp, _id: { $lt: cursor.id } },
  ];

  const records = await AuditLog.find(filter).sort({ timestamp: -1, _id: -1 }).limit(limit + 1).populate("actorId", "name email");
  const hasMore = records.length > limit;
  const page = records.slice(0, limit);
  const entries = page.map((entry) => ({ ...entry.toObject({ virtuals: true }), description: descriptionFor(entry) }));
  res.json({ success: true, entries, hasMore, nextCursor: hasMore ? encodeCursor(page.at(-1)) : null });
}
