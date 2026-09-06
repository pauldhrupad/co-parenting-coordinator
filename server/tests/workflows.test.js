import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../src/app.js";
import { config } from "../src/config.js";
import { AuditLog, CustodyEvent, Expense, Family, MessageLog, User } from "../src/models/index.js";

let replica;
let parentA;
let parentB;
let outsider;
let family;
let tokenA;
let tokenB;
let outsiderToken;

const tokenFor = (user) => jwt.sign({ sub: String(user._id), email: user.email }, config.jwtSecret, { expiresIn: "1h" });
const auth = (token) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replica.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await replica.stop();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  const passwordHash = await bcrypt.hash("Password1!", 4);
  [parentA, parentB, outsider] = await User.create([
    { name: "Parent A", email: "a@example.com", password: passwordHash },
    { name: "Parent B", email: "b@example.com", password: passwordHash },
    { name: "Outside User", email: "outside@example.com", password: passwordHash },
  ]);
  family = await Family.create({ name: "Test Family", parents: [parentA._id, parentB._id], children: [{ name: "Child One", dob: "2018-01-10" }], inviteCode: "TEST24", createdBy: parentA._id });
  tokenA = tokenFor(parentA); tokenB = tokenFor(parentB); outsiderToken = tokenFor(outsider);
});

describe("family boundaries", () => {
  it("rejects invalid family membership and duplicate parents", async () => {
    await expect(Family.create({ name: "Invalid Family", parents: [parentA._id, parentA._id], children: [{ name: "Child", dob: "2019-01-01" }], inviteCode: "BAD123", createdBy: parentA._id })).rejects.toThrow("distinct parents");
    const response = await request(app).get("/api/expenses").set(auth(outsiderToken));
    expect(response.status).toBe(404);
  });
});

describe("expense lifecycle", () => {
  it("enforces reviewer permissions, settles manually, and audits every change", async () => {
    const childId = family.children[0]._id;
    const created = await request(app).post("/api/expenses").set(auth(tokenA)).send({ familyId: family._id, childId, title: "School books", amount: 99.99, paidBy: parentA._id, splitRatio: { parent1: 50, parent2: 50 } });
    expect(created.status).toBe(201);
    expect(created.body.expense.amount).toBe(99.99);
    const id = created.body.expense._id;

    const selfApproval = await request(app).patch(`/api/expenses/${id}/approve`).set(auth(tokenA));
    expect(selfApproval.status).toBe(403);
    const approval = await request(app).patch(`/api/expenses/${id}/approve`).set(auth(tokenB));
    expect(approval.status).toBe(200);
    expect(approval.body.expense.status).toBe("approved");
    const settlement = await request(app).patch(`/api/expenses/${id}/settle`).set(auth(tokenA));
    expect(settlement.body.expense.status).toBe("settled");
    expect(await AuditLog.countDocuments({ entityId: id })).toBe(3);
  });

  it("rejects invalid amounts, invalid splits, and invalid state transitions", async () => {
    const childId = family.children[0]._id;
    const base = { familyId: family._id, childId, title: "School supplies", paidBy: parentA._id };

    const invalidAmount = await request(app).post("/api/expenses").set(auth(tokenA)).send({ ...base, amount: -2, splitRatio: { parent1: 50, parent2: 50 } });
    expect(invalidAmount.status).toBe(400);
    const invalidSplit = await request(app).post("/api/expenses").set(auth(tokenA)).send({ ...base, amount: 100, splitRatio: { parent1: 70, parent2: 40 } });
    expect(invalidSplit.status).toBe(400);

    const created = await request(app).post("/api/expenses").set(auth(tokenA)).send({ ...base, amount: 100, splitRatio: { parent1: 60, parent2: 40 } });
    const settleProposed = await request(app).patch(`/api/expenses/${created.body.expense._id}/settle`).set(auth(tokenA));
    expect(settleProposed.status).toBe(409);
  });

  it("requires a dispute note and a manual resolution before settlement", async () => {
    const created = await request(app).post("/api/expenses").set(auth(tokenA)).send({
      familyId: family._id,
      childId: family.children[0]._id,
      title: "Sports uniform",
      amount: 1200,
      paidBy: parentA._id,
      splitRatio: { parent1: 50, parent2: 50 },
    });
    const id = created.body.expense._id;
    const missingNote = await request(app).patch(`/api/expenses/${id}/dispute`).set(auth(tokenB));
    expect(missingNote.status).toBe(400);
    const disputed = await request(app).patch(`/api/expenses/${id}/dispute`).set(auth(tokenB)).send({ note: "The receipt does not match the amount." });
    expect(disputed.body.expense.status).toBe("disputed");
    expect(disputed.body.expense.approvals.at(-1).note).toContain("receipt");

    const unresolved = await request(app).patch(`/api/expenses/${id}/settle`).set(auth(tokenA));
    expect(unresolved.status).toBe(409);
    const resolved = await request(app).patch(`/api/expenses/${id}/settle`).set(auth(tokenA)).send({ resolutionNote: "Both parents reviewed the corrected receipt and agreed." });
    expect(resolved.status).toBe(200);
    expect(resolved.body.expense.status).toBe("settled");
    expect(resolved.body.expense.resolutionNote).toContain("agreed");
  });

  it("filters lists and calculates child, month, and net balance from recognized states only", async () => {
    const childId = family.children[0]._id;
    const propose = async (token, proposedBy, paidBy, title, amount, splitRatio) => {
      const response = await request(app).post("/api/expenses").set(auth(token)).send({ familyId: family._id, childId, title, amount, paidBy, splitRatio });
      expect(response.status).toBe(201);
      return response.body.expense;
    };

    const first = await propose(tokenA, parentA, parentA._id, "Approved school fee", 1000, { parent1: 60, parent2: 40 });
    await request(app).patch(`/api/expenses/${first._id}/approve`).set(auth(tokenB));
    const second = await propose(tokenB, parentB, parentB._id, "Approved medical fee", 500, { parent1: 60, parent2: 40 });
    await request(app).patch(`/api/expenses/${second._id}/approve`).set(auth(tokenA));
    await propose(tokenA, parentA, parentA._id, "Ignored proposal", 9000, { parent1: 50, parent2: 50 });
    const disputed = await propose(tokenA, parentA, parentA._id, "Ignored dispute", 8000, { parent1: 50, parent2: 50 });
    await request(app).patch(`/api/expenses/${disputed._id}/dispute`).set(auth(tokenB)).send({ note: "Not agreed" });

    const approvedList = await request(app).get(`/api/expenses/${family._id}?childId=${childId}&status=approved`).set(auth(tokenA));
    expect(approvedList.status).toBe(200);
    expect(approvedList.body.expenses).toHaveLength(2);

    const summary = await request(app).get(`/api/expenses/${family._id}/summary`).set(auth(tokenA));
    expect(summary.status).toBe(200);
    expect(summary.body.summary.totalSpent).toBe(1500);
    expect(summary.body.summary.perChild[0]).toMatchObject({ childName: "Child One", totalSpent: 1500, expenseCount: 2 });
    expect(summary.body.summary.perMonth[0]).toMatchObject({ totalSpent: 1500, expenseCount: 2 });
    // Parent A is owed 40% of 1000, but owes 60% of the 500 paid by Parent B: net +100.
    expect(summary.body.summary.netBalance).toMatchObject({ amount: 100, creditorId: String(parentA._id), debtorId: String(parentB._id) });
  });
});

describe("receipt upload validation", () => {
  it("accepts only authenticated image input for the receipt endpoint", async () => {
    const missing = await request(app).post("/api/uploads/receipt").set(auth(tokenA));
    expect(missing.status).toBe(400);
    const wrongType = await request(app).post("/api/uploads/receipt").set(auth(tokenA)).attach("receipt", Buffer.from("not an image"), { filename: "receipt.txt", contentType: "text/plain" });
    expect(wrongType.status).toBe(400);
    expect(wrongType.body.message).toContain("image");
  });
});

describe("notifications and history export", () => {
  it("counts only actions awaiting the signed-in parent", async () => {
    const childId = family.children[0]._id;
    await request(app).post("/api/expenses").set(auth(tokenA)).send({ familyId: family._id, childId, title: "Music lessons", amount: 1500, paidBy: parentA._id, splitRatio: { parent1: 50, parent2: 50 } });

    const start = new Date(Date.now() + 12 * 86400000);
    const original = await request(app).post("/api/custody").set(auth(tokenA)).send({ familyId: family._id, childId, startDate: start, endDate: new Date(start.getTime() + 3600000), assignedParent: parentA._id, type: "regular" });
    await request(app).post(`/api/custody/${original.body.event._id}/swap-request`).set(auth(tokenB)).send({ startDate: new Date(start.getTime() + 86400000), endDate: new Date(start.getTime() + 86400000 + 3600000), assignedParent: parentB._id });

    const parentACounts = await request(app).get("/api/notifications/pending-count").set(auth(tokenA));
    expect(parentACounts.body.counts).toEqual({ pendingSwaps: 1, proposedExpenses: 0, total: 1 });
    const parentBCounts = await request(app).get("/api/notifications/pending-count").set(auth(tokenB));
    expect(parentBCounts.body.counts).toEqual({ pendingSwaps: 0, proposedExpenses: 1, total: 1 });
  });

  it("exports authorized chronological CSV and PDF history", async () => {
    await request(app).post("/api/messages").set(auth(tokenA)).send({ content: "The school meeting starts at four." });
    const csv = await request(app).get(`/api/export/${family._id}?format=csv`).set(auth(tokenB));
    expect(csv.status).toBe(200);
    expect(csv.headers["content-type"]).toContain("text/csv");
    expect(csv.headers["content-disposition"]).toContain("attachment");
    expect(csv.text).toContain("timestamp,actor,type,description/content".split(",").map((value) => `\"${value}\"`).join(","));
    expect(csv.text).toContain("The school meeting starts at four.");

    const pdf = await request(app).get(`/api/export/${family._id}?format=pdf`).set(auth(tokenA)).buffer(true).parse((response, callback) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => callback(null, Buffer.concat(chunks)));
    });
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
    expect(pdf.body.subarray(0, 5).toString()).toBe("%PDF-");
    expect((await request(app).get(`/api/export/${family._id}?format=csv`).set(auth(outsiderToken))).status).toBe(403);
  });
});

describe("custody swaps", () => {
  it("creates, sorts, and rejects overlapping confirmed events", async () => {
    const childId = family.children[0]._id;
    const start = new Date(Date.now() + 3 * 86400000);
    const end = new Date(start.getTime() + 2 * 3600000);
    const created = await request(app).post("/api/custody").set(auth(tokenA)).send({
      familyId: family._id,
      childId,
      startDate: start,
      endDate: end,
      assignedParent: parentA._id,
      type: "regular",
    });
    expect(created.status).toBe(201);

    const selfExcludedUpdate = await request(app).patch(`/api/custody/${created.body.event._id}`).set(auth(tokenA)).send({ startDate: start, endDate: end });
    expect(selfExcludedUpdate.status).toBe(200);

    const overlap = await request(app).post("/api/custody").set(auth(tokenB)).send({
      familyId: family._id,
      childId,
      startDate: new Date(start.getTime() + 3600000),
      endDate: new Date(end.getTime() + 3600000),
      assignedParent: parentB._id,
      type: "holiday",
    });
    expect(overlap.status).toBe(409);
    expect(overlap.body).toMatchObject({ success: false });
    expect(overlap.body.message).toContain("Custody conflict");

    const list = await request(app).get(`/api/custody/${family._id}?sort=asc`).set(auth(tokenA));
    expect(list.status).toBe(200);
    expect(list.body.events).toHaveLength(1);
    expect(list.body.events[0]._id).toBe(created.body.event._id);
    const forbiddenList = await request(app).get(`/api/custody/${family._id}`).set(auth(outsiderToken));
    expect(forbiddenList.status).toBe(403);
  });

  it("serializes simultaneous confirmed writes so only one overlapping request succeeds", async () => {
    const childId = family.children[0]._id;
    const start = new Date(Date.now() + 6 * 86400000);
    const payload = {
      familyId: family._id,
      childId,
      startDate: start,
      endDate: new Date(start.getTime() + 3600000),
      assignedParent: parentA._id,
      type: "regular",
    };
    const [first, second] = await Promise.all([
      request(app).post("/api/custody").set(auth(tokenA)).send(payload),
      request(app).post("/api/custody").set(auth(tokenB)).send({ ...payload, assignedParent: parentB._id }),
    ]);
    expect([first.status, second.status].sort()).toEqual([201, 409]);
    expect(await CustodyEvent.countDocuments({ familyId: family._id, childId, status: "confirmed" })).toBe(1);
  });

  it("allows only the event creator to delete in the parent-only v1 role model", async () => {
    const childId = family.children[0]._id;
    const start = new Date(Date.now() + 4 * 86400000);
    const event = await CustodyEvent.create({ familyId: family._id, childId, assignedParent: parentA._id, startDate: start, endDate: new Date(start.getTime() + 3600000), type: "regular", createdBy: parentA._id });
    const denied = await request(app).delete(`/api/custody/${event._id}`).set(auth(tokenB));
    expect(denied.status).toBe(403);
    const removed = await request(app).delete(`/api/custody/${event._id}`).set(auth(tokenA));
    expect(removed.status).toBe(200);
    expect(await CustodyEvent.findById(event._id)).toBeNull();
  });

  it("preserves the request until the other parent accepts it", async () => {
    const childId = family.children[0]._id;
    const start = new Date(Date.now() + 86400000);
    const end = new Date(start.getTime() + 3600000);
    const [event] = await CustodyEvent.create([{ familyId: family._id, childId, assignedParent: parentA._id, startDate: start, endDate: end, type: "regular", createdBy: parentA._id }]);
    const assignedParentRequest = await request(app).post(`/api/custody/${event._id}/swap-request`).set(auth(tokenA)).send({ startDate: new Date(start.getTime() + 86400000), endDate: new Date(end.getTime() + 86400000), assignedParent: parentB._id });
    expect(assignedParentRequest.status).toBe(403);
    const requestSwap = await request(app).post(`/api/custody/${event._id}/swap-request`).set(auth(tokenB)).send({ startDate: new Date(start.getTime() + 86400000), endDate: new Date(end.getTime() + 86400000), assignedParent: parentB._id });
    expect(requestSwap.status).toBe(201);
    expect(requestSwap.body.event.status).toBe("pending-swap");
    const pendingId = requestSwap.body.event._id;
    const selfResponse = await request(app).patch(`/api/custody/${pendingId}/respond`).set(auth(tokenB)).send({ action: "accept" });
    expect(selfResponse.status).toBe(403);
    const accepted = await request(app).patch(`/api/custody/${pendingId}/respond`).set(auth(tokenA)).send({ action: "accept" });
    expect(accepted.status).toBe(200);
    expect(accepted.body.event.status).toBe("confirmed");
    expect(String(accepted.body.event.assignedParent._id)).toBe(String(parentB._id));
    expect(await CustodyEvent.findById(event._id)).toBeNull();
  });

  it("removes a rejected request and leaves the original event confirmed", async () => {
    const childId = family.children[0]._id;
    const start = new Date(Date.now() + 5 * 86400000);
    const original = await CustodyEvent.create({ familyId: family._id, childId, assignedParent: parentA._id, startDate: start, endDate: new Date(start.getTime() + 3600000), type: "regular", createdBy: parentA._id });
    const requested = await request(app).post(`/api/custody/${original._id}/swap-request`).set(auth(tokenB)).send({ startDate: new Date(start.getTime() + 86400000), endDate: new Date(start.getTime() + 86400000 + 3600000), assignedParent: parentB._id });
    const rejected = await request(app).patch(`/api/custody/${requested.body.event._id}/respond`).set(auth(tokenA)).send({ action: "reject", reason: "The original schedule must remain" });
    expect(rejected.status).toBe(200);
    expect((await CustodyEvent.findById(original._id)).status).toBe("confirmed");
    expect(await CustodyEvent.findById(requested.body.event._id)).toBeNull();
  });
});

describe("append-only records", () => {
  it("creates messages and blocks update and delete operations", async () => {
    const sent = await request(app).post("/api/messages").set(auth(tokenA)).send({ messageType: "decision", body: "We both agreed to attend the school meeting." });
    expect(sent.status).toBe(201);
    const id = sent.body.message._id;
    await expect(MessageLog.updateOne({ _id: id }, { body: "changed" })).rejects.toThrow("cannot be updated or deleted");
    await expect(MessageLog.deleteOne({ _id: id })).rejects.toThrow("cannot be updated or deleted");
    expect(await AuditLog.countDocuments({ entityId: id })).toBe(1);
  });

  it("omits message mutation routes and permanently keeps editedFlag false", async () => {
    const sent = await request(app).post("/api/messages").set(auth(tokenA)).send({ content: "Pickup will be at the school gate." });
    const id = sent.body.message._id;
    expect(sent.body.message.editedFlag).toBe(false);
    expect((await request(app).patch(`/api/messages/${id}`).set(auth(tokenA)).send({ content: "Changed" })).status).toBe(404);
    expect((await request(app).delete(`/api/messages/${id}`).set(auth(tokenA))).status).toBe(404);
    await expect(MessageLog.create({ familyId: family._id, senderId: parentA._id, content: "Invalid edited message", editedFlag: true })).rejects.toThrow("never be marked as edited");
  });

  it("paginates messages without duplicates using opaque compound cursors", async () => {
    for (const content of ["First record", "Second record", "Third record"]) {
      expect((await request(app).post("/api/messages").set(auth(tokenA)).send({ content })).status).toBe(201);
    }
    const firstPage = await request(app).get(`/api/messages/${family._id}?limit=2`).set(auth(tokenB));
    expect(firstPage.body.messages.map((message) => message.content)).toEqual(["Second record", "Third record"]);
    expect(firstPage.body.hasMore).toBe(true);
    const secondPage = await request(app).get(`/api/messages/${family._id}?limit=2&cursor=${encodeURIComponent(firstPage.body.nextCursor)}`).set(auth(tokenB));
    expect(secondPage.body.messages.map((message) => message.content)).toEqual(["First record"]);
    expect(new Set([...firstPage.body.messages, ...secondPage.body.messages].map((message) => message._id)).size).toBe(3);
  });

  it("records message, expense dispute, and accepted swap with accurate snapshots and ordering", async () => {
    const childId = family.children[0]._id;
    const sent = await request(app).post("/api/messages").set(auth(tokenA)).send({ content: "Please review the upcoming changes." });
    expect(sent.status).toBe(201);

    const proposed = await request(app).post("/api/expenses").set(auth(tokenA)).send({ familyId: family._id, childId, title: "Soccer cleats", amount: 2400, paidBy: parentA._id, splitRatio: { parent1: 50, parent2: 50 } });
    const disputed = await request(app).patch(`/api/expenses/${proposed.body.expense._id}/dispute`).set(auth(tokenB)).send({ note: "Please provide the itemized receipt." });
    expect(disputed.status).toBe(200);

    const start = new Date(Date.now() + 10 * 86400000);
    const original = await request(app).post("/api/custody").set(auth(tokenA)).send({ familyId: family._id, childId, startDate: start, endDate: new Date(start.getTime() + 3600000), assignedParent: parentA._id, type: "regular" });
    const swap = await request(app).post(`/api/custody/${original.body.event._id}/swap-request`).set(auth(tokenB)).send({ startDate: new Date(start.getTime() + 86400000), endDate: new Date(start.getTime() + 86400000 + 3600000), assignedParent: parentB._id });
    const accepted = await request(app).patch(`/api/custody/${swap.body.event._id}/respond`).set(auth(tokenA)).send({ action: "accept" });
    expect(accepted.status).toBe(200);

    const trail = await request(app).get(`/api/audit/${family._id}?limit=50`).set(auth(tokenA));
    expect(trail.status).toBe(200);
    const relevant = trail.body.entries.filter((entry) => ["message.sent", "expense.disputed", "custody.swap_accepted"].includes(entry.action));
    expect(relevant.map((entry) => entry.action)).toEqual(["custody.swap_accepted", "expense.disputed", "message.sent"]);

    const expenseAudit = relevant.find((entry) => entry.action === "expense.disputed");
    expect(expenseAudit.previousState.status).toBe("proposed");
    expect(expenseAudit.newState.status).toBe("disputed");
    expect(expenseAudit.description).toContain("Soccer cleats");
    const swapAudit = relevant.find((entry) => entry.action === "custody.swap_accepted");
    expect(swapAudit.previousState.status).toBe("pending-swap");
    expect(swapAudit.newState.status).toBe("confirmed");
    const messageAudit = relevant.find((entry) => entry.action === "message.sent");
    expect(messageAudit.previousState).toBeNull();
    expect(messageAudit.newState.content).toContain("upcoming changes");

    expect((await request(app).get(`/api/audit/${family._id}`).set(auth(outsiderToken))).status).toBe(403);
    await expect(AuditLog.updateOne({ _id: expenseAudit._id }, { action: "tampered" })).rejects.toThrow("cannot be updated or deleted");
    await expect(AuditLog.deleteOne({ _id: expenseAudit._id })).rejects.toThrow("cannot be updated or deleted");
  });
});
