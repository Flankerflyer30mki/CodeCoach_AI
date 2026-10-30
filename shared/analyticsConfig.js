// Single source of truth for every analytics constant.
// Pure values only (no dotenv, no env reads) so it is safe to import anywhere.
export default {
  lambda: 0.005, // temporal decay per day: weight = e^(-lambda * ageInDays)

  // Minimum history before a profile (user or peer) is analysed at all
  minTotalProblems: 30,

  // Confidence = min(1, effectiveN / minEffectiveAttempts)
  minEffectiveAttempts: 10,
  confidenceThreshold: 0.3,

  // Topics peers barely practise are noise at this rating
  minImportance: 0.025,

  // A peer metric based on fewer peers than this is ignored
  minPeersPerMetric: 20,

  // z-score thresholds for the signals
  thresholds: { avoided: 1.0, underdeveloped: 0.3, struggling: 1.0 },

  // Weights of the four gaps (each gap is a z-score, so they are comparable)
  gapWeights: { attempt: 0.25, success: 0.25, coverage: 0.25, conversion: 0.25 },

  // Floors for peer std so a near-zero std cannot blow up a z-score
  minStd: { attemptRatio: 0.005, solveRate: 0.05, coverage: 50, dcr: 0.05 },
  zClip: 3,
};
