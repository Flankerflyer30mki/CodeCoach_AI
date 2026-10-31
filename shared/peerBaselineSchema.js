// Plain schema definitions (no mongoose import) so pipeline and server share ONE shape.
const stat = { mean: Number, std: Number, n: Number };

export const peerBaselineDefinition = {
  version: { type: String, required: true }, // pipeline run id; only the one in BaselineMeta is served
  bandKey: { type: String, required: true }, // e.g. "1300-1400" or "2400+"
  topic: { type: String, required: true },
  userCount: Number, // valid peers in the sample for this band
  sampleMeanRating: Number,
  computedAt: Date,
  metrics: {
    attempters: Number,
    attemptRatio: stat,
    solveRate: stat,
    coverage: { p10: stat, p50: stat, p90: stat },
    dcr: { bucket0_100: stat, bucket100_300: stat, bucket300plus: stat },
  },
};

// Single document { _id: "current" } pointing at the last fully-written version.
export const baselineMetaDefinition = {
  _id: String,
  version: String,
  seed: Number,
  computedAt: Date,
};
