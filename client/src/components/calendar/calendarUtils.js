export const PARENT_COLORS = ["var(--parent-a)", "var(--parent-b)"];

export function entityId(value) {
  if (!value) return "";
  return String(typeof value === "object" ? value._id : value);
}

export function eventTypeLabel(type) {
  return ({
    regular: "Regular custody",
    holiday: "Holiday custody",
    "swap-request": "Swap request",
  })[type] || "Custody event";
}

export function childName(family, childId) {
  return family.children.find((child) => entityId(child) === entityId(childId))?.fullName || "Child";
}

export function toCalendarEvent(event, family) {
  return {
    ...event,
    title: `${eventTypeLabel(event.type)} · ${childName(family, event.childId)}`,
    start: new Date(event.startDate),
    end: new Date(event.endDate),
  };
}

export function eventVisualStyle(event, family) {
  const parentIndex = Math.max(0, family.parents.findIndex((parent) => entityId(parent) === entityId(event.assignedParent)));
  const parentColor = PARENT_COLORS[parentIndex % PARENT_COLORS.length];

  if (event.status === "disputed") {
    return { backgroundColor: "var(--event-disputed)", border: "2px solid var(--event-disputed)", color: "var(--event-ink)" };
  }

  if (event.status === "pending-swap") {
    return { backgroundColor: parentColor, border: "2px dashed var(--event-ink)", color: "var(--event-ink)", opacity: .98 };
  }

  return { backgroundColor: parentColor, border: `2px solid ${parentColor}`, color: "var(--event-ink)", opacity: 1 };
}

export function friendlyCustodyError(error) {
  const message = String(error?.message || "");
  if (error?.status === 409 && /conflict|overlap/i.test(message)) return "This change conflicts with another confirmed event for this child. Choose a different time range.";
  if (error?.status === 401) return "Your session has expired. Sign in again to continue.";
  if (/cannot reach/i.test(message)) return "The calendar could not reach the server. Check your connection and try again.";
  return message || "The calendar could not complete that action. Please try again.";
}

export function applyAcceptedSwap(events, acceptedEvent) {
  const acceptedId = entityId(acceptedEvent);
  const originalId = entityId(acceptedEvent.originalEvent);
  return [...events.filter((event) => ![acceptedId, originalId].includes(entityId(event))), acceptedEvent]
    .sort((left, right) => new Date(left.startDate) - new Date(right.startDate));
}
