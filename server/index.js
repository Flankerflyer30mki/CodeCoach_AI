import "./env.js"; // must stay first: loads .env before other modules read it
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { loadConfig, validateConfig } from "./config.js";
import { BaselineMeta } from "./models/peerBaseline.js";

const config = loadConfig();
const { errors, warnings } = validateConfig(config);
warnings.forEach((w) => console.warn(`Config warning: ${w}`));
if (errors.length > 0) {
  console.error(`Config error: ${errors.join("; ")}`);
  process.exit(1);
}

let shuttingDown = false;

const readiness = async () => {
  const db = mongoose.connection.readyState === 1;
  const baseline = db ? Boolean(await BaselineMeta.exists({ _id: "current" })) : false;
  return { ready: db && baseline && !shuttingDown, checks: { db, baseline, shuttingDown } };
};

try {
  await mongoose.connect(config.mongoUri);
  console.log("MongoDB connected successfully");
} catch (error) {
  console.error("MongoDB connection failed:", error.message);
  process.exit(1);
}

const server = createApp({ config, readiness }).listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

// Graceful shutdown: stop taking new connections, let in-flight analyses finish,
// then close the DB. Readiness flips to 503 immediately so the platform stops routing here.
const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received: draining in-flight requests`);
  const force = setTimeout(() => {
    console.error("Drain timed out, forcing exit");
    process.exit(1);
  }, 25000);
  force.unref();
  server.close(async () => {
    await mongoose.connection.close();
    clearTimeout(force);
    process.exit(0);
  });
  server.closeIdleConnections();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
