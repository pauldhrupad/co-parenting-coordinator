import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
await mongoose.connect(replica.getUri());
const [{ default: app }, { CustodyEvent, Expense, Family, MessageLog, User }] = await Promise.all([import("./app.js"), import("./models/index.js")]);

const passwordHash = await bcrypt.hash("Demo1234!", 10);
const [dhruv, meera] = await User.create([
  { name: "Dhruv Sharma", email: "dhruv@example.com", password: passwordHash },
  { name: "Meera Sharma", email: "meera@example.com", password: passwordHash },
]);
const family = await Family.create({ name: "The Sharma Family", parents: [dhruv._id, meera._id], children: [{ name: "Aarav Sharma", dob: "2017-04-12" }, { name: "Anaya Sharma", dob: "2020-10-03" }], inviteCode: "DEMO24", createdBy: dhruv._id });
const [aarav, anaya] = family.children;
const now = new Date();
const inDays = (days, hour = 9) => { const value = new Date(now); value.setDate(value.getDate() + days); value.setHours(hour, 0, 0, 0); return value; };
const [, afterSchoolEvent] = await CustodyEvent.create([
  { familyId: family._id, childId: aarav._id, assignedParent: dhruv._id, startDate: inDays(1, 9), endDate: inDays(3, 8), type: "regular", createdBy: dhruv._id },
  { familyId: family._id, childId: anaya._id, assignedParent: meera._id, startDate: inDays(4, 15), endDate: inDays(5, 8), type: "regular", createdBy: meera._id },
]);
await CustodyEvent.create({ familyId: family._id, childId: afterSchoolEvent.childId, assignedParent: dhruv._id, startDate: inDays(5, 15), endDate: inDays(6, 8), type: "swap-request", status: "pending-swap", requestedBy: dhruv._id, originalEvent: afterSchoolEvent._id, createdBy: dhruv._id });
await Expense.create([
  { familyId: family._id, childId: aarav._id, title: "School activity fee", amount: 3200, paidBy: meera._id, proposedBy: meera._id, splitRatio: { parent1: 50, parent2: 50 } },
  { familyId: family._id, childId: anaya._id, title: "Dental check-up", amount: 1800, paidBy: dhruv._id, proposedBy: dhruv._id, splitRatio: { parent1: 50, parent2: 50 }, status: "approved", approvals: [{ parentId: meera._id, action: "approve", timestamp: inDays(-5) }] },
]);
await MessageLog.create([
  { familyId: family._id, senderId: meera._id, content: "I’ll pack Aarav’s blue jacket for Monday." },
  { familyId: family._id, senderId: dhruv._id, messageType: "decision", content: "Parent-teacher meeting attendance confirmed: we will both attend." },
]);

const server = app.listen(5000, () => console.log("Demo API ready at http://localhost:5000 — dhruv@example.com / Demo1234!"));
async function shutdown() { server.close(); await mongoose.disconnect(); await replica.stop(); process.exit(0); }
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
