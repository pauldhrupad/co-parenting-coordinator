import { CustodyEvent } from "../models/index.js";

/**
 * Half-open interval comparison: touching boundaries are valid handoffs, not overlaps.
 */
export function rangesOverlap(firstStart, firstEnd, secondStart, secondEnd) {
  return new Date(firstStart) < new Date(secondEnd) && new Date(firstEnd) > new Date(secondStart);
}

/**
 * Returns whether a proposed [startDate, endDate) conflicts with a confirmed event.
 * `excludeEventId` prevents an event from matching itself during an update.
 * The optional session is used internally by transactional scheduling operations.
 */
export async function hasOverlap(familyId, childId, startDate, endDate, excludeEventId = null, session = null) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw new TypeError("A valid date range with endDate after startDate is required");

  const filter = {
    familyId,
    childId,
    status: "confirmed",
    startDate: { $lt: end },
    endDate: { $gt: start },
  };
  if (excludeEventId) filter._id = { $ne: excludeEventId };
  const query = CustodyEvent.exists(filter);
  if (session) query.session(session);
  return Boolean(await query);
}
