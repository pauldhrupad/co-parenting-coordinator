import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CustodyCalendar from "./CustodyCalendar";
import { api } from "../../lib/api";

vi.mock("../../lib/api", () => ({ api: vi.fn() }));

const family = {
  _id: "family-1",
  parents: [{ _id: "parent-a", displayName: "Parent A" }, { _id: "parent-b", displayName: "Parent B" }],
  children: [{ _id: "child-1", fullName: "Child One" }],
};

afterEach(() => vi.clearAllMocks());

describe("CustodyCalendar states", () => {
  it("fetches the family events and shows the first-event empty state", async () => {
    api.mockResolvedValueOnce({ success: true, events: [] });
    render(<CustodyCalendar family={family} user={{ id: "parent-a", displayName: "Parent A" }}/>);

    expect(screen.getByLabelText(/loading custody events/i)).toBeInTheDocument();
    expect(await screen.findByText(/your shared calendar is ready/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add your first event/i })).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith("/custody/family-1?");
  });

  it("shows a clear retry action when loading fails", async () => {
    api.mockRejectedValueOnce(new Error("Cannot reach the API"));
    render(<CustodyCalendar family={family} user={{ id: "parent-a", displayName: "Parent A" }}/>);

    expect(await screen.findByText(/couldn’t load the calendar/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});
