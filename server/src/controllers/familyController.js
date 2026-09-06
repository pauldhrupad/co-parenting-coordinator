import crypto from "node:crypto";
import { Family } from "../models/index.js";
import { AppError } from "../utils/http.js";

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomInviteCode() {
  return Array.from({ length: 6 }, () => INVITE_ALPHABET[crypto.randomInt(INVITE_ALPHABET.length)]).join("");
}

async function uniqueInviteCode(session = null) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = randomInviteCode();
    const query = Family.exists({ inviteCode: code });
    if (session) query.session(session);
    if (!(await query)) return code;
  }
  throw new AppError(503, "Could not generate an invite code; please try again");
}

export async function createFamily(req, res) {
  const session = req.dbSession;
  if (await Family.exists({ parents: req.user._id }).session(session)) throw new AppError(409, "This account is already linked to a family");
  const name = String(req.body.name || "").trim();
  const children = req.body.children;
  if (name.length < 2 || !Array.isArray(children) || !children.length) throw new AppError(400, "Family name and at least one child are required");
  const inviteCode = await uniqueInviteCode(session);

  const [family] = await Family.create([{ name, parents: [req.user._id], children, inviteCode, createdBy: req.user._id }], { session });
  await family.populate("parents", "name email role");
  res.status(201).json({ success: true, family, inviteCode: family.inviteCode });
}

export async function joinFamily(req, res) {
  const session = req.dbSession;
  const code = String(req.params.code || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) throw new AppError(404, "Invite code is invalid or expired");
  if (await Family.exists({ parents: req.user._id }).session(session)) throw new AppError(409, "This account is already linked to a family");

  const family = await Family.findOne({ inviteCode: code }).session(session);
  if (!family) throw new AppError(404, "Invite code is invalid or expired");
  if (family.parents.some((id) => id.equals(req.user._id))) throw new AppError(409, "You are already a member of this family");
  if (family.parents.length >= 2) throw new AppError(409, "This family already has two parents");
  family.parents.push(req.user._id);
  await family.save({ session });
  await family.populate("parents", "name email role");
  res.json({ success: true, family });
}

export async function getMyFamily(req, res) {
  const family = await Family.findOne({ parents: req.user._id }).populate("parents", "name email role");
  res.json({ success: true, family: family || null });
}
