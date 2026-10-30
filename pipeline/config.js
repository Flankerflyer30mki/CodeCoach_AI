import dotenv from "dotenv";
dotenv.config();

// Pipeline-only settings. Analytics constants live in shared/analyticsConfig.js.
export default {
  mongoUri: process.env.MONGO_URI,
  cfApiBase: process.env.CF_API_BASE || "https://codeforces.com/api",
  rateLimitMs: parseInt(process.env.RATE_LIMIT_MS) || 2000,
  usersPerBand: 300,
  candidateMultiplier: 2, // look at up to 2x usersPerBand candidates to fill the quota
  refreshDays: 14,
};
