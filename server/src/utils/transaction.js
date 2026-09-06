import mongoose from "mongoose";
import { config } from "../config.js";

export async function withTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => { result = await work(session); });
    return result;
  } catch (error) {
    const unsupported = error.code === 20 || /Transaction numbers are only allowed/.test(error.message);
    if (unsupported && config.nodeEnv !== "production") return work(null);
    throw error;
  } finally {
    await session.endSession();
  }
}
