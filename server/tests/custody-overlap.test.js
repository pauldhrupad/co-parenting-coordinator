import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { CustodyEvent, Family } from "../src/models/index.js";
import { hasOverlap, rangesOverlap } from "../src/services/custodyOverlap.js";

let replica;
let family;
let childId;
let parentAId;

const at = (day, hour = 9) => new Date(`2035-01-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00.000Z`);

async function confirmedEvent(startDate = at(10), endDate = at(12)) {
  return CustodyEvent.create({
    familyId: family._id,
    childId,
    startDate,
    endDate,
    assignedParent: parentAId,
    type: "regular",
    status: "confirmed",
    createdBy: parentAId,
  });
}

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
  parentAId = new mongoose.Types.ObjectId();
  const parentBId = new mongoose.Types.ObjectId();
  family = await Family.create({
    name: "Overlap Test Family",
    parents: [parentAId, parentBId],
    children: [{ name: "Test Child", dob: "2019-05-10" }],
    inviteCode: "OVR123",
    createdBy: parentAId,
  });
  childId = family.children[0]._id;
});

describe("rangesOverlap", () => {
  it("uses half-open intervals, so adjacent events do not overlap", () => {
    expect(rangesOverlap(at(8), at(10), at(10), at(12))).toBe(false);
  });
});

describe("hasOverlap", () => {
  it("returns false when no existing events exist", async () => {
    await expect(hasOverlap(family._id, childId, at(10), at(12))).resolves.toBe(false);
  });

  it("returns false when the new event is fully before the existing event", async () => {
    await confirmedEvent();
    await expect(hasOverlap(family._id, childId, at(8), at(10))).resolves.toBe(false);
  });

  it("returns false when the new event is fully after the existing event", async () => {
    await confirmedEvent();
    await expect(hasOverlap(family._id, childId, at(12), at(14))).resolves.toBe(false);
  });

  it("returns true when the new event partially overlaps the start of an existing event", async () => {
    await confirmedEvent();
    await expect(hasOverlap(family._id, childId, at(9), at(11))).resolves.toBe(true);
  });

  it("returns true when the new event partially overlaps the end of an existing event", async () => {
    await confirmedEvent();
    await expect(hasOverlap(family._id, childId, at(11), at(13))).resolves.toBe(true);
  });

  it("returns true when the new event fully contains an existing event", async () => {
    await confirmedEvent();
    await expect(hasOverlap(family._id, childId, at(9), at(13))).resolves.toBe(true);
  });

  it("returns true when the new event is fully contained within an existing event", async () => {
    await confirmedEvent();
    await expect(hasOverlap(family._id, childId, at(10, 10), at(10, 15))).resolves.toBe(true);
  });

  it("excludes the event's own id during an update", async () => {
    const event = await confirmedEvent();
    await expect(hasOverlap(family._id, childId, event.startDate, event.endDate, event._id)).resolves.toBe(false);
  });

  it("does not report an overlap for a different child in the same family", async () => {
    await confirmedEvent();
    family.children.push({ name: "Second Child", dob: "2021-03-12" });
    await family.save();
    const secondChildId = family.children.at(-1)._id;
    await expect(hasOverlap(family._id, secondChildId, at(10), at(12))).resolves.toBe(false);
  });
});
