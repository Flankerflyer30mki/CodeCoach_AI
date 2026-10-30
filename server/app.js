import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { analyzeUser } from "./controllers/analyzeController.js";
import { createAdmission, notFound, errorHandler } from "./middleware.js";
import { sendError } from "./http.js";

// readiness: async () => ({ ready: boolean, checks: object })
export const createApp = ({ config, readiness = async () => ({ ready: true, checks: {} }), analyze = analyzeUser }) => {
  const app = express();
  app.set("trust proxy", config.trustProxy);

  app.use(helmet());

  // exposedHeaders: without it a browser on another origin cannot read Retry-After,
  // so the UI could never tell the user how long to wait.
  app.use(
    cors({
      origin: config.allowedOrigins,
      methods: ["GET", "POST", "OPTIONS"],
      exposedHeaders: ["Retry-After"],
    }),
  );

  // Health checks come before the limiter/body parser so probes are never throttled.
  // Liveness: is the process up. Readiness: can it serve the core product (DB + baseline).
  // An LLM outage does NOT affect readiness: the template report still works.
  app.get("/health/live", (req, res) => res.json({ status: "ok" }));
  app.get("/health/ready", async (req, res) => {
    try {
      const { ready, checks } = await readiness();
      res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready", checks });
    } catch (err) {
      console.error("Readiness check failed:", err.message);
      res.status(503).json({ status: "not_ready" });
    }
  });

  app.use(express.json({ limit: "1kb" })); // the body is just { handle }

  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res) => {
      sendError(res, 429, "RATE_LIMITED", "Too many requests. Please wait a few minutes and try again.");
    },
  });
  const admission = createAdmission({
    maxTotal: config.maxConcurrentAnalyses,
    maxPerClient: config.maxConcurrentPerClient,
  });

  app.post("/api/analyze", limiter, admission.wrap(analyze));

  app.use(notFound);
  app.use(errorHandler);
  return app;
};
