// All deployment settings in one place. Every value has a safe default for local dev.
const DEFAULT_ORIGINS = ["http://localhost:5173", "https://code-coach-ai-steel.vercel.app"];

const list = (v, fallback) =>
  v ? v.split(",").map((s) => s.trim()).filter(Boolean) : fallback;
const int = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

export const loadConfig = (env = process.env) => ({
  port: int(env.PORT, 5000),
  mongoUri: env.MONGO_URI,

  // exact origins allowed to call the API from a browser (CORS is not authentication)
  allowedOrigins: list(env.ALLOWED_ORIGINS, DEFAULT_ORIGINS),

  // Number of reverse proxies in front of the app. 0 = trust none (safe default:
  // X-Forwarded-For cannot be spoofed). Behind Railway set TRUST_PROXY=1, otherwise
  // every user appears to come from the proxy and shares ONE rate-limit bucket.
  trustProxy: int(env.TRUST_PROXY, 0),

  // inbound limit on /api/analyze, per client IP (process-local)
  rateLimit: {
    windowMs: int(env.RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000),
    max: int(env.RATE_LIMIT_MAX, 10),
  },

  // work admission: analyses running at once (process-local)
  maxConcurrentAnalyses: int(env.MAX_CONCURRENT_ANALYSES, 5),
  maxConcurrentPerClient: int(env.MAX_CONCURRENT_PER_CLIENT, 2),

  hasGroq: Boolean(env.GROQ_API_KEY),
  hasGemini: Boolean(env.GEMINI_API_KEY),
});

// errors stop startup; warnings are only logged
export const validateConfig = (c) => {
  const errors = [];
  const warnings = [];
  if (!c.mongoUri) errors.push("MONGO_URI is not set");
  if (!c.hasGroq && !c.hasGemini) {
    warnings.push("No GROQ_API_KEY or GEMINI_API_KEY: reports will use the template text");
  }
  if (c.trustProxy === 0) {
    warnings.push("TRUST_PROXY=0: behind a reverse proxy (e.g. Railway) set TRUST_PROXY=1 or all users share one rate limit");
  }
  return { errors, warnings };
};
