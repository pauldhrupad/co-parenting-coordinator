export const entityId = (value) => String(value?._id || value?.id || value || "");

export function childName(family, childId) {
  return family?.children.find((child) => entityId(child) === entityId(childId))?.fullName || "Child";
}

export function parentName(family, parentId) {
  return family?.parents.find((parent) => entityId(parent) === entityId(parentId))?.displayName || "Parent";
}

export function latestDispute(expense) {
  return [...(expense.approvals || [])].reverse().find((approval) => approval.action === "dispute");
}

export function monthLabel(value) {
  const [year, month] = String(value).split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

