import { describe, expect, it } from "vitest";
import { applyAcceptedSwap, eventVisualStyle, friendlyCustodyError, toCalendarEvent } from "./calendarUtils";

const family = {
  parents: [{ _id: "parent-a", displayName: "Parent A" }, { _id: "parent-b", displayName: "Parent B" }],
  children: [{ _id: "child-1", fullName: "Child One" }],
};

const event = {
  _id: "event-1",
  childId: "child-1",
  assignedParent: { _id: "parent-a", displayName: "Parent A" },
  type: "regular",
  status: "confirmed",
  startDate: "2035-01-10T09:00:00.000Z",
  endDate: "2035-01-10T17:00:00.000Z",
};

describe("calendar event mapping", () => {
  it("maps API dates and custody metadata to react-big-calendar fields", () => {
    const mapped = toCalendarEvent(event, family);
    expect(mapped.title).toBe("Regular custody · Child One");
    expect(mapped.start).toBeInstanceOf(Date);
    expect(mapped.end).toBeInstanceOf(Date);
    expect(mapped.status).toBe("confirmed");
  });

  it("assigns different colors to each family parent", () => {
    const first = eventVisualStyle(event, family);
    const second = eventVisualStyle({ ...event, assignedParent: { _id: "parent-b" } }, family);
    expect(first.backgroundColor).not.toBe(second.backgroundColor);
  });

  it("uses a dashed, lighter treatment for pending swaps", () => {
    const style = eventVisualStyle({ ...event, status: "pending-swap" }, family);
    expect(style.border).toContain("dashed");
    expect(style.opacity).toBeLessThan(1);
  });
});

describe("calendar state helpers", () => {
  it("turns backend overlap responses into a human-readable message", () => {
    expect(friendlyCustodyError({ status: 409, message: "Custody conflict" })).toMatch(/conflicts with another confirmed event/i);
  });

  it("optimistically replaces the original and pending event after acceptance", () => {
    const pending = { ...event, _id: "pending-1", originalEvent: "event-1", status: "pending-swap" };
    const accepted = { ...pending, status: "confirmed" };
    const result = applyAcceptedSwap([event, pending], accepted);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(accepted);
  });
});
