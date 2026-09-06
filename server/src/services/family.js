import { Family } from "../models/index.js";
import { AppError } from "../utils/http.js";

export async function getFamilyForUser(userId, session = null) {
  const query = Family.findOne({ parents: userId });
  if (session) query.session(session);
  const family = await query;
  if (!family) throw new AppError(404, "No family is linked to this account");
  return family;
}

export function assertFamilyParent(family, userId) {
  if (!family.parents.some((id) => id.equals(userId))) throw new AppError(403, "You do not have access to this family");
}

export function assertChildren(family, childIds) {
  const known = new Set(family.children.map((child) => String(child._id)));
  if (!Array.isArray(childIds) || !childIds.length || childIds.some((id) => !known.has(String(id)))) throw new AppError(400, "Every selected child must belong to the family");
}

export function otherParent(family, userId) {
  return family.parents.find((id) => !id.equals(userId));
}
