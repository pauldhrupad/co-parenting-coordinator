import { AppError } from "../utils/http.js";

/**
 * Validates one expense transition and returns its next state without mutating the
 * document. Keeping this policy pure makes every state-machine branch unit-testable.
 */
export function nextExpenseState(expense, action, { actorId, note = "", resolutionNote = "" } = {}) {
  const current = expense.status;
  if (!["approve", "dispute", "settle"].includes(action)) throw new AppError(400, "Unknown expense transition");

  if (["approve", "dispute"].includes(action)) {
    if (current !== "proposed") throw new AppError(409, `Only proposed expenses can be ${action === "approve" ? "approved" : "disputed"}`);
    if (String(expense.proposedBy) === String(actorId)) throw new AppError(403, `You cannot ${action} your own expense proposal`);
    if (action === "dispute" && !String(note).trim()) throw new AppError(400, "A note explaining the dispute is required");
    return action === "approve" ? "approved" : "disputed";
  }

  if (current === "proposed") throw new AppError(409, "A proposed expense cannot be settled before review");
  if (current === "settled") throw new AppError(409, "This expense is already settled");
  if (current === "disputed" && !String(resolutionNote).trim()) throw new AppError(409, "A disputed expense requires a manual resolution note before it can be settled");
  if (!["approved", "disputed"].includes(current)) throw new AppError(409, "This expense cannot be settled from its current state");
  return "settled";
}

