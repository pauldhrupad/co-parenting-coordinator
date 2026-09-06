import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { Expense } from "../src/models/index.js";
import { nextExpenseState } from "../src/services/expenseStateMachine.js";

const proposerId = new mongoose.Types.ObjectId();
const reviewerId = new mongoose.Types.ObjectId();
const expenseIn = (status) => ({ status, proposedBy: proposerId });

describe("expense state machine", () => {
  it("allows proposed -> approved by the other parent", () => {
    expect(nextExpenseState(expenseIn("proposed"), "approve", { actorId: reviewerId })).toBe("approved");
  });

  it("allows proposed -> disputed when the other parent provides a note", () => {
    expect(nextExpenseState(expenseIn("proposed"), "dispute", { actorId: reviewerId, note: "The amount needs clarification." })).toBe("disputed");
  });

  it("rejects proposed -> settled", () => {
    expect(() => nextExpenseState(expenseIn("proposed"), "settle", { actorId: reviewerId })).toThrow("cannot be settled before review");
  });

  it("rejects disputed -> settled without a manual resolution", () => {
    expect(() => nextExpenseState(expenseIn("disputed"), "settle", { actorId: proposerId })).toThrow("manual resolution note");
  });

  it("allows disputed -> settled through the defined resolution path", () => {
    expect(nextExpenseState(expenseIn("disputed"), "settle", { actorId: proposerId, resolutionNote: "Both parents agreed after reviewing the receipt." })).toBe("settled");
  });

  it("allows approved -> settled", () => {
    expect(nextExpenseState(expenseIn("approved"), "settle", { actorId: proposerId })).toBe("settled");
  });

  it("rejects self-approval by the proposing parent", () => {
    expect(() => nextExpenseState(expenseIn("proposed"), "approve", { actorId: proposerId })).toThrow("cannot approve your own");
  });

  it("rejects approval after an expense is disputed", () => {
    expect(() => nextExpenseState(expenseIn("disputed"), "approve", { actorId: reviewerId })).toThrow("Only proposed expenses");
  });

  it("rejects a split ratio that does not total 100 at schema validation", async () => {
    const invalid = new Expense({
      familyId: new mongoose.Types.ObjectId(),
      childId: new mongoose.Types.ObjectId(),
      title: "School transport",
      amount: 500,
      paidBy: proposerId,
      proposedBy: proposerId,
      splitRatio: { parent1: 70, parent2: 40 },
    });
    await expect(invalid.validate()).rejects.toThrow("must sum to 100");
  });
});
