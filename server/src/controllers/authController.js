import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { Family, User } from "../models/index.js";
import { AppError, publicUser } from "../utils/http.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createToken(user) {
  return jwt.sign({ sub: String(user._id), email: user.email, role: user.role }, config.jwtSecret, { expiresIn: "8h" });
}

export async function register(req, res) {
  const session = req.dbSession;
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (name.length < 2 || !emailPattern.test(email) || password.length < 8) throw new AppError(400, "Name, valid email, and a password of at least 8 characters are required");
  if (await User.exists({ email }).session(session)) throw new AppError(409, "An account with this email already exists");

  const [user] = await User.create([{ name, email, password: await bcrypt.hash(password, 12), role: "parent" }], { session });
  res.status(201).json({ success: true, token: createToken(user), user: publicUser(user) });
}

export async function login(req, res) {
  const email = String(req.body.email || "").trim().toLowerCase();
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await bcrypt.compare(String(req.body.password || ""), user.password))) throw new AppError(401, "Email or password is incorrect");
  if (!user.isActive) throw new AppError(401, "This account is unavailable");
  res.json({ success: true, token: createToken(user), user: publicUser(user) });
}

export async function me(req, res) {
  res.json({ success: true, user: publicUser(req.user) });
}

export async function updateProfile(req, res) {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (name.length < 2 || name.length > 80 || !emailPattern.test(email)) {
    throw new AppError(400, "Enter a name of at least 2 characters and a valid email address");
  }

  const session = req.dbSession;
  const user = await User.findById(req.user._id).select("+password").session(session);
  if (!user?.isActive) throw new AppError(401, "Account is unavailable");
  const emailChanged = user.email !== email;
  if (emailChanged) {
    if (!password) throw new AppError(400, "Your current password is required to change your email address");
    if (!(await bcrypt.compare(password, user.password))) throw new AppError(401, "Your current password is incorrect");
    const existing = await User.exists({ email, _id: { $ne: user._id } }).session(session);
    if (existing) throw new AppError(409, "An account with this email already exists");
  }

  const family = await Family.findOne({ parents: user._id }).session(session);
  req.accountFamilyId = family?._id || null;
  user.name = name;
  user.email = email;
  await user.save({ session });
  res.json({ success: true, message: "Your profile has been updated.", user: publicUser(user) });
}

// User documents are deliberately deactivated rather than removed: their name,
// messages, approvals, and audit entries must remain part of the family record.
export async function deactivateAccount(req, res) {
  const confirmation = String(req.body.confirmation || "");
  const password = String(req.body.password || "");
  if (confirmation !== "DELETE") throw new AppError(400, 'Type DELETE to confirm account deletion');
  if (!password) throw new AppError(400, "Your current password is required");

  const session = req.dbSession;
  const user = await User.findById(req.user._id).select("+password").session(session);
  if (!user?.isActive) throw new AppError(401, "Account is unavailable");
  if (!(await bcrypt.compare(password, user.password))) throw new AppError(401, "Your current password is incorrect");

  const family = await Family.findOne({ parents: user._id }).session(session);
  req.accountFamilyId = family?._id || null;
  user.isActive = false;
  await user.save({ session });

  res.json({
    success: true,
    message: "Your account has been deactivated and you have been signed out.",
    user: { ...publicUser(user), isActive: false },
  });
}
