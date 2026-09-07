import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../src/app.js";
import { config } from "../src/config.js";
import { AuditLog, Family } from "../src/models/index.js";

let replica;

beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replica.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await replica.stop();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});

async function register(name, email) {
  return request(app).post("/api/auth/register").send({ name, email, password: "Password1!" });
}

describe("Phase 1 authentication and family invitation flow", () => {
  it("registers, logs in, creates a family, joins it, and returns the same family to both parents", async () => {
    const first = await register("First Parent", "first@example.com");
    const second = await register("Second Parent", "second@example.com");
    expect(first.status).toBe(201);
    expect(first.body.user.role).toBe("parent");
    expect(first.body.token).toBeTruthy();

    const login = await request(app).post("/api/auth/login").send({ email: "first@example.com", password: "Password1!" });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();

    const created = await request(app).post("/api/family/create").set("Authorization", `Bearer ${first.body.token}`).send({ name: "Shared Family", children: [{ name: "Child One", dob: "2018-05-20" }] });
    expect(created.status).toBe(201);
    expect(created.body.inviteCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(created.body.family.parents).toHaveLength(1);

    const joined = await request(app).post(`/api/family/join/${created.body.inviteCode}`).set("Authorization", `Bearer ${second.body.token}`);
    expect(joined.status).toBe(200);
    expect(joined.body.family.parents).toHaveLength(2);

    const [firstView, secondView] = await Promise.all([
      request(app).get("/api/family/me").set("Authorization", `Bearer ${first.body.token}`),
      request(app).get("/api/family/me").set("Authorization", `Bearer ${second.body.token}`),
    ]);
    expect(firstView.body.family._id).toBe(secondView.body.family._id);
    expect(firstView.body.family.parents).toHaveLength(2);
    expect(await Family.countDocuments()).toBe(1);
  });

  it("returns explicit errors for duplicate email and incorrect password", async () => {
    await register("First Parent", "first@example.com");
    const duplicate = await register("Another Parent", "first@example.com");
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toMatchObject({ success: false, message: "An account with this email already exists" });
    const wrongPassword = await request(app).post("/api/auth/login").send({ email: "first@example.com", password: "wrong-password" });
    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.success).toBe(false);
  });

  it("rejects a protected route when the token is missing or invalid", async () => {
    const missing = await request(app).get("/api/family/me");
    expect(missing.status).toBe(401);
    expect(missing.body.message).toMatch(/authentication required/i);

    const invalid = await request(app).get("/api/family/me").set("Authorization", "Bearer not-a-valid-jwt");
    expect(invalid.status).toBe(401);
    expect(invalid.body.message).toMatch(/invalid or expired/i);
  });

  it("rejects an expired JWT on a protected route", async () => {
    const registered = await register("First Parent", "first@example.com");
    const expired = jwt.sign({ sub: registered.body.user.id }, config.jwtSecret, { expiresIn: -1 });
    const response = await request(app).get("/api/family/me").set("Authorization", `Bearer ${expired}`);
    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/invalid or expired/i);
  });

  it("rejects invalid invite codes, repeat membership, and a third parent", async () => {
    const first = await register("First Parent", "first@example.com");
    const second = await register("Second Parent", "second@example.com");
    const third = await register("Third Parent", "third@example.com");
    const invalid = await request(app).post("/api/family/join/NOPE99").set("Authorization", `Bearer ${second.body.token}`);
    expect(invalid.status).toBe(404);

    const created = await request(app).post("/api/family/create").set("Authorization", `Bearer ${first.body.token}`).send({ name: "Shared Family", children: [{ name: "Child", dob: "2019-03-02" }] });
    await request(app).post(`/api/family/join/${created.body.inviteCode}`).set("Authorization", `Bearer ${second.body.token}`);
    const repeat = await request(app).post(`/api/family/join/${created.body.inviteCode}`).set("Authorization", `Bearer ${second.body.token}`);
    expect(repeat.status).toBe(409);
    const full = await request(app).post(`/api/family/join/${created.body.inviteCode}`).set("Authorization", `Bearer ${third.body.token}`);
    expect(full.status).toBe(409);
    expect(full.body.message).toMatch(/two parents/i);
  });

  it("deactivates an account only after password and explicit confirmation, while preserving its audit record", async () => {
    const first = await register("First Parent", "first@example.com");
    const created = await request(app).post("/api/family/create").set("Authorization", `Bearer ${first.body.token}`).send({ name: "Shared Family", children: [{ name: "Child", dob: "2019-03-02" }] });

    const missingConfirmation = await request(app).delete("/api/auth/me").set("Authorization", `Bearer ${first.body.token}`).send({ password: "Password1!" });
    expect(missingConfirmation.status).toBe(400);

    const deleted = await request(app).delete("/api/auth/me").set("Authorization", `Bearer ${first.body.token}`).send({ password: "Password1!", confirmation: "DELETE" });
    expect(deleted.status).toBe(200);
    expect(deleted.body.user.isActive).toBe(false);

    const afterDeletion = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${first.body.token}`);
    expect(afterDeletion.status).toBe(401);
    const relogin = await request(app).post("/api/auth/login").send({ email: "first@example.com", password: "Password1!" });
    expect(relogin.status).toBe(401);

    const audit = await AuditLog.findOne({ action: "user.deactivated" });
    expect(audit.familyId.equals(created.body.family._id)).toBe(true);
    expect(audit.newState.isActive).toBe(false);
  });
});
