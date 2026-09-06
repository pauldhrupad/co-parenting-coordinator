import { describe, expect, it } from "vitest";
import { childName, entityId, latestDispute, monthLabel, parentName } from "./expenseUtils";

const family = {
  parents: [{ _id: "parent-a", displayName: "Parent A" }, { _id: "parent-b", displayName: "Parent B" }],
  children: [{ _id: "child-a", fullName: "Child One" }],
};

describe("expense display helpers", () => {
  it("normalizes populated and plain identifiers", () => {
    expect(entityId({ _id: "abc" })).toBe("abc");
    expect(entityId("abc")).toBe("abc");
    expect(childName(family, "child-a")).toBe("Child One");
    expect(parentName(family, { _id: "parent-b" })).toBe("Parent B");
  });

  it("returns the latest dispute reason from immutable approval history", () => {
    const expense = { approvals: [{ action: "dispute", note: "First reason" }, { action: "approve" }, { action: "dispute", note: "Current reason" }] };
    expect(latestDispute(expense).note).toBe("Current reason");
  });

  it("turns aggregation month keys into readable labels", () => {
    expect(monthLabel("2026-09")).toContain("2026");
  });
});
