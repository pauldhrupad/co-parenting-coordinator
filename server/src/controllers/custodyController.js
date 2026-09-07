import mongoose from "mongoose";
import { config } from "../config.js";
import { CustodyEvent, Family, User } from "../models/index.js";
import { afterCommit } from "../services/audit.js";
import { hasOverlap } from "../services/custodyOverlap.js";
import { sendNotificationEmail } from "../services/email.js";
import { AppError } from "../utils/http.js";

const CONFLICT_MESSAGE = "Custody conflict: this child already has a confirmed event in that date range";

function parseDateRange(startValue, endValue, { future = true } = {}) {
  const startDate = new Date(startValue);
  const endDate = new Date(endValue);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) throw new AppError(400, "Valid startDate and endDate values are required");
  if (endDate <= startDate) throw new AppError(400, "endDate must be later than startDate");
  if (future && startDate < new Date(Date.now() - 1000)) throw new AppError(400, "startDate cannot be in the past");
  return { startDate, endDate };
}

async function loadFamilyForParent(familyId, userId, session = null) {
  if (familyId && !mongoose.isValidObjectId(familyId)) throw new AppError(400, "A valid familyId is required");
  const query = familyId ? Family.findById(familyId) : Family.findOne({ parents: userId });
  if (session) query.session(session);
  const family = await query;
  if (!family) throw new AppError(404, "Family not found");
  if (!family.parents.some((parentId) => parentId.equals(userId))) throw new AppError(403, "You do not have access to this family");
  return family;
}

function assertFamilyChild(family, childId) {
  if (!mongoose.isValidObjectId(childId) || !family.children.some((child) => child._id.equals(childId))) throw new AppError(400, "childId must identify a child in this family");
}

function assertFamilyParent(family, parentId) {
  if (!mongoose.isValidObjectId(parentId) || !family.parents.some((id) => id.equals(parentId))) throw new AppError(400, "assignedParent must belong to this family");
}

async function serializeFamilySchedule(familyId, session) {
  await Family.updateOne({ _id: familyId }, { $inc: { scheduleRevision: 1 } }, { session });
}

function normalizedInput(body) {
  return {
    familyId: body.familyId || body.family,
    childId: body.childId || body.childIds?.[0],
    startDate: body.startDate || body.startsAt,
    endDate: body.endDate || body.endsAt,
    assignedParent: body.assignedParent || body.custodialParent,
    type: body.type || "regular",
  };
}

async function populateEvent(event) {
  return event.populate("assignedParent requestedBy createdBy", "name email role");
}

export async function createCustodyEvent(req, res) {
  const session = req.dbSession;
  const input = normalizedInput(req.body);
  if (input.type === "swap-request") throw new AppError(400, "Use the swap-request endpoint to create swap requests");
  if (!["regular", "holiday"].includes(input.type)) throw new AppError(400, "type must be regular or holiday");
  const dates = parseDateRange(input.startDate, input.endDate);
  const family = await loadFamilyForParent(input.familyId, req.user._id, session);
  assertFamilyChild(family, input.childId);
  assertFamilyParent(family, input.assignedParent);

  await serializeFamilySchedule(family._id, session);
  if (await hasOverlap(family._id, input.childId, dates.startDate, dates.endDate, null, session)) throw new AppError(409, CONFLICT_MESSAGE);
  const [event] = await CustodyEvent.create([{ familyId: family._id, childId: input.childId, ...dates, assignedParent: input.assignedParent, type: input.type, status: "confirmed", createdBy: req.user._id }], { session });
  res.status(201).json({ success: true, event: await populateEvent(event) });
}

export async function listCustodyEvents(req, res) {
  const family = await loadFamilyForParent(req.params.familyId, req.user._id);
  const direction = req.query.sort === "desc" ? -1 : 1;
  const filter = { familyId: family._id };
  if (req.query.childId) {
    assertFamilyChild(family, req.query.childId);
    filter.childId = req.query.childId;
  }
  if (req.query.status) {
    if (!["confirmed", "pending-swap", "disputed"].includes(req.query.status)) throw new AppError(400, "Invalid custody status filter");
    filter.status = req.query.status;
  }
  const events = await CustodyEvent.find(filter).sort({ startDate: direction, _id: direction }).populate("assignedParent requestedBy createdBy", "name email role");
  res.json({ success: true, events });
}

export async function updateCustodyEvent(req, res) {
  const session = req.dbSession;
  const event = await CustodyEvent.findById(req.params.id).session(session);
  if (!event) throw new AppError(404, "Custody event not found");
  const family = await loadFamilyForParent(event.familyId, req.user._id, session);
  if (event.status !== "confirmed") throw new AppError(409, "Only confirmed events can be updated through this endpoint");
  const dates = parseDateRange(req.body.startDate || req.body.startsAt || event.startDate, req.body.endDate || req.body.endsAt || event.endDate);

  await serializeFamilySchedule(family._id, session);
  if (await hasOverlap(family._id, event.childId, dates.startDate, dates.endDate, event._id, session)) throw new AppError(409, CONFLICT_MESSAGE);
  event.startDate = dates.startDate;
  event.endDate = dates.endDate;
  await event.save({ session });
  res.json({ success: true, event: await populateEvent(event) });
}

export async function deleteCustodyEvent(req, res) {
  const session = req.dbSession;
  const event = await CustodyEvent.findById(req.params.id).session(session);
  if (!event) throw new AppError(404, "Custody event not found");
  await loadFamilyForParent(event.familyId, req.user._id, session);
  const isCreator = event.createdBy.equals(req.user._id);
  const isAdminEquivalent = req.user.role === "admin";
  if (!isCreator && !isAdminEquivalent) throw new AppError(403, "Only the event creator can delete this custody event");

  await serializeFamilySchedule(event.familyId, session);
  const pendingQuery = CustodyEvent.exists({ originalEvent: event._id, status: "pending-swap" }).session(session);
  if (await pendingQuery) throw new AppError(409, "Resolve or withdraw the pending swap before deleting the original event");
  await CustodyEvent.deleteOne({ _id: event._id }, { session });
  res.json({ success: true, message: "Custody event deleted" });
}

export async function requestCustodySwap(req, res) {
  const session = req.dbSession;
  const original = await CustodyEvent.findById(req.params.id).session(session);
  if (!original) throw new AppError(404, "Original custody event not found");
  const family = await loadFamilyForParent(original.familyId, req.user._id, session);
  if (original.status !== "confirmed") throw new AppError(409, "Only a confirmed event can receive a swap request");
  if (original.assignedParent.equals(req.user._id)) throw new AppError(403, "The assigned parent cannot request a swap against their own event");
  const dates = parseDateRange(req.body.startDate || req.body.proposedStartAt, req.body.endDate || req.body.proposedEndAt);
  const assignedParent = req.body.assignedParent || req.body.proposedCustodialParent || req.user._id;
  assertFamilyParent(family, assignedParent);

  await serializeFamilySchedule(family._id, session);
  const existingQuery = CustodyEvent.exists({ originalEvent: original._id, status: "pending-swap" }).session(session);
  if (await existingQuery) throw new AppError(409, "This event already has a pending swap request");
  const [pending] = await CustodyEvent.create([{ familyId: family._id, childId: original.childId, ...dates, assignedParent, type: "swap-request", status: "pending-swap", requestedBy: req.user._id, originalEvent: original._id, createdBy: req.user._id }], { session });
  const recipient = await User.findById(original.assignedParent).session(session).select("name email");
  afterCommit(req, () => sendNotificationEmail(recipient?.email, "New custody swap request", "newSwapRequest", {
    recipientName: recipient?.displayName,
    actorName: req.user.displayName,
    familyName: family.name,
    startDate: dates.startDate,
    endDate: dates.endDate,
    actionUrl: `${config.clientUrl}/calendar`,
  }));
  res.status(201).json({ success: true, event: await populateEvent(pending) });
}

export async function respondToCustodySwap(req, res) {
  const session = req.dbSession;
  const requestedAction = String(req.body.action || "").toLowerCase();
  const action = requestedAction === "dispute" ? "reject" : requestedAction;
  if (!["accept", "reject"].includes(action)) throw new AppError(400, "action must be accept or reject");
  const pending = await CustodyEvent.findById(req.params.id).session(session);
  if (!pending || pending.status !== "pending-swap" || pending.type !== "swap-request") throw new AppError(404, "Pending swap request not found");
  const family = await loadFamilyForParent(pending.familyId, req.user._id, session);
  if (pending.requestedBy.equals(req.user._id)) throw new AppError(403, "You cannot respond to your own swap request");
  const original = await CustodyEvent.findById(pending.originalEvent).session(session);
  if (!original) throw new AppError(409, "The original custody event no longer exists");
  if (!original.assignedParent.equals(req.user._id)) throw new AppError(403, "Only the parent assigned to the original event can respond");
  const requester = await User.findById(pending.requestedBy).session(session).select("name email");

  if (action === "reject") {
    await CustodyEvent.deleteOne({ _id: pending._id }, { session });
    afterCommit(req, () => sendNotificationEmail(requester?.email, "Custody swap declined", "custodySwapRejected", {
      recipientName: requester?.displayName,
      actorName: req.user.displayName,
      familyName: family.name,
      startDate: original.startDate,
      endDate: original.endDate,
      actionUrl: `${config.clientUrl}/calendar`,
    }));
    return res.json({ success: true, message: "Swap request rejected; the original event remains confirmed" });
  }

  await serializeFamilySchedule(family._id, session);
  if (await hasOverlap(family._id, pending.childId, pending.startDate, pending.endDate, original._id, session)) throw new AppError(409, CONFLICT_MESSAGE);
  await CustodyEvent.deleteOne({ _id: original._id }, { session });
  pending.status = "confirmed";
  pending.requestedBy = null;
  await pending.save({ session });
  afterCommit(req, () => sendNotificationEmail(requester?.email, "Custody swap accepted", "custodySwapAccepted", {
    recipientName: requester?.displayName,
    actorName: req.user.displayName,
    familyName: family.name,
    startDate: pending.startDate,
    endDate: pending.endDate,
    actionUrl: `${config.clientUrl}/calendar`,
  }));
  return res.json({ success: true, event: await populateEvent(pending), message: "Swap accepted and original event replaced" });
}
