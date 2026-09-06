import mongoose from "mongoose";
import { Router } from "express";
import { Family, MessageLog, User } from "../models/index.js";
import { requireAuth } from "../middleware/auth.js";
import { afterCommit, auditedRoute, responseEntity, stateFamilyId, stateId } from "../services/audit.js";
import { getFamilyForUser, otherParent } from "../services/family.js";
import { sendNotification } from "../services/email.js";
import { AppError, asyncHandler } from "../utils/http.js";

const router = Router();
router.use(requireAuth);

function decodeCursor(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const timestamp = new Date(parsed.timestamp);
    if (Number.isNaN(timestamp.getTime()) || !mongoose.isValidObjectId(parsed.id)) throw new Error();
    return { timestamp, id: new mongoose.Types.ObjectId(parsed.id) };
  } catch {
    throw new AppError(400, "Invalid message cursor");
  }
}

function encodeCursor(message) {
  return Buffer.from(JSON.stringify({ timestamp: message.timestamp, id: message._id })).toString("base64url");
}

async function familyFromRequest(req) {
  const familyId = req.params.familyId;
  if (!familyId) return getFamilyForUser(req.user._id);
  if (!mongoose.isValidObjectId(familyId)) throw new AppError(400, "A valid familyId is required");
  const family = await Family.findById(familyId);
  if (!family) throw new AppError(404, "Family not found");
  if (!family.parents.some((id) => id.equals(req.user._id))) throw new AppError(403, "You do not have access to this family");
  return family;
}

async function listMessages(req, res) {
  const family = await familyFromRequest(req);
  const filter = { familyId: family._id };
  if (req.query.type) {
    if (!["message", "decision"].includes(req.query.type)) throw new AppError(400, "Invalid message type filter");
    filter.messageType = req.query.type;
  }
  const cursor = decodeCursor(req.query.cursor);
  if (cursor) {
    filter.$or = [
      { timestamp: { $lt: cursor.timestamp } },
      { timestamp: cursor.timestamp, _id: { $lt: cursor.id } },
    ];
  } else if (req.query.before) {
    const before = new Date(req.query.before);
    if (Number.isNaN(before.getTime())) throw new AppError(400, "Invalid message cursor");
    filter.timestamp = { $lt: before };
  }
  const limit = Math.min(Math.max(Number(req.query.limit) || 40, 1), 100);
  const newestFirst = await MessageLog.find(filter).sort({ timestamp: -1, _id: -1 }).limit(limit + 1).populate("senderId", "name email");
  const hasMore = newestFirst.length > limit;
  const page = newestFirst.slice(0, limit).reverse();
  res.json({ success: true, messages: page, hasMore, nextCursor: hasMore ? encodeCursor(page[0]) : null });
}

async function createMessage(req, res) {
  const family = await getFamilyForUser(req.user._id, req.dbSession);
  if (req.body.familyId && !family._id.equals(req.body.familyId)) throw new AppError(403, "You do not have access to this family");
  const content = String(req.body.content ?? req.body.body ?? "").trim();
  if (!content) throw new AppError(400, "Message content is required");
  const attachments = req.body.attachments || [];
  if (!Array.isArray(attachments)) throw new AppError(400, "attachments must be an array");
  const messageType = req.body.messageType || "message";
  if (!["message", "decision"].includes(messageType)) throw new AppError(400, "Invalid message type");

  const [message] = await MessageLog.create([{
    familyId: family._id,
    senderId: req.user._id,
    content,
    timestamp: new Date(),
    editedFlag: false,
    messageType,
    attachments,
  }], { session: req.dbSession });
  await message.populate("senderId", "name email");

  const recipient = await User.findById(otherParent(family, req.user._id));
  afterCommit(req, () => sendNotification({ to: recipient?.email, subject: messageType === "decision" ? "New family decision recorded" : "New family message", text: `${req.user.displayName}: ${content.slice(0, 240)}` }));
  res.status(201).json({ success: true, message });
}

router.get("/", asyncHandler(listMessages));
router.get("/:familyId", asyncHandler(listMessages));
router.post("/", auditedRoute({
  action: "message.sent",
  entityType: "MessageLog",
  newState: responseEntity("message"),
  entityId: stateId,
  familyId: stateFamilyId,
}, createMessage));

// PATCH and DELETE routes are deliberately absent. An API that has no mutation
// endpoint is a stronger guarantee than hiding controls in the frontend because
// a caller cannot bypass the UI and send a direct edit or deletion request.

export default router;
