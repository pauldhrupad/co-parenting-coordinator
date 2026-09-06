import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { User } from "../models/index.js";
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
