import mongoose from "mongoose";
import app from "./app.js";
import { config } from "./config.js";

await mongoose.connect(config.mongoUri);
app.listen(config.port, () => console.log(`API listening on http://localhost:${config.port}`));

async function shutdown() {
  await mongoose.disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
