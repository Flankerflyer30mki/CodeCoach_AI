import dotenv from "dotenv";
dotenv.config();

const config = {
  // db
  mongoUri: process.env.MONGO_URI,

  // Cf API
  cfApiBase: process.env.CF_API_BASE,

  // Pipeline settings
  rateLimitMs: parseInt(process.env.RATE_LIMIT_MS) || 1000,
  submissionsPerUser: 500,
  usersPerBand: 300,

  // Temporal decay
  lambda: 0.005,

  // Confidence thresholds
  confidenceThreshold: 0.3,
  minAttemptsForConfidence: 10,
  expectedRatingSpread: 600,

  // Confidence weights
  confidenceWeights: {
    size: 0.4,
    spread: 0.3,
    recency: 0.3,
  },

  // Gap weights for total_gap formula
  gapWeights: {
    attempt: 0.25,
    success: 0.25,
    coverage: 0.25,
    conversion: 0.25,
  },

  // Rating bands — each entry is [bandMin, bandMax]
  ratingBands: [
    [800, 900],
    [900, 1000],
    [1000, 1100],
    [1100, 1200],
    [1200, 1300],
    [1300, 1400],
    [1400, 1500],
    [1500, 1600],
    [1600, 1700],
    [1700, 1800],
    [1800, 1900],
    [1900, 2000],
    [2000, 2100],
    [2100, 2200],
    [2200, 2300],
    [2300, 2400],
    [2400, 10000],
  ],

  // DCR difficulty buckets [min, max] relative to user rating
  dcrBuckets: [
    [0, 100],
    [100, 300],
    [300, Infinity],
  ],
};

export default config;
