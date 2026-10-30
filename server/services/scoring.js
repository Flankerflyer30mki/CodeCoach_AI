import config from "../../shared/analyticsConfig.js";

// Pure functions only: no DB, no network. Everything here is unit-tested.

const NO_ATTEMPTS = {
  problemCount: 0,
  effectiveN: 0,
  attemptRatio: 0, // a true zero: the user really did not attempt this topic
  solveRate: null,
  coverage: { p10: null, p50: null, p90: null },
  dcr: { bucket0_100: null, bucket100_300: null, bucket300plus: null },
};

const BUCKETS = ["bucket0_100", "bucket100_300", "bucket300plus"];

// A peer stat is only trusted if enough peers contributed to it
const usable = (s) => s && s.mean !== null && s.n >= config.minPeersPerMetric;

// Gap in peer-std units, with a floor on std and a clip on the result
const toZ = (gap, std, minStd) => {
  const z = gap / Math.max(std ?? 0, minStd);
  return Math.max(-config.zClip, Math.min(config.zClip, z));
};

// Confidence = how many equally-weighted observations the user's topic history is
// worth (Kish effective sample size), capped at 1. Recency is already inside it.
export const computeConfidence = (user) =>
  Math.min(user.effectiveN / config.minEffectiveAttempts, 1);

// Raw gaps are in natural units (shown in the UI). z-gaps are what gets combined.
// null = cannot be measured (no attempts, or too few peers); never silently 0.
export const computeGaps = (user, peer) => {
  const m = peer.metrics;
  const floor = config.minStd;
  const gaps = { attemptGap: null, successGap: null, coverageGap: null, conversionGap: null };
  const z = { attempt: null, success: null, coverage: null, conversion: null };

  gaps.attemptGap = m.attemptRatio.mean - user.attemptRatio;
  z.attempt = toZ(gaps.attemptGap, m.attemptRatio.std, floor.attemptRatio);

  if (usable(m.solveRate) && user.solveRate !== null) {
    gaps.successGap = m.solveRate.mean - user.solveRate;
    z.success = toZ(gaps.successGap, m.solveRate.std, floor.solveRate);
  }

  if (usable(m.coverage.p90) && user.coverage.p90 !== null) {
    gaps.coverageGap = m.coverage.p90.mean - user.coverage.p90;
    z.coverage = toZ(gaps.coverageGap, m.coverage.p90.std, floor.coverage);
  }

  // conversion: average over the buckets where BOTH the user and enough peers have data
  const diffs = [];
  const zs = [];
  for (const b of BUCKETS) {
    if (usable(m.dcr[b]) && user.dcr[b] !== null) {
      const diff = m.dcr[b].mean - user.dcr[b];
      diffs.push(diff);
      zs.push(toZ(diff, m.dcr[b].std, floor.dcr));
    }
  }
  if (diffs.length > 0) {
    gaps.conversionGap = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    z.conversion = zs.reduce((a, b) => a + b, 0) / zs.length;
  }
  return { gaps, z };
};

// Signals are independent; `classification` is only the primary label for display.
// Precedence: avoided > underdeveloped > struggling.
// Success/coverage signals need confident data; "avoided" does not (zero attempts
// is a real observation).
export const classify = (z, confidence) => {
  const t = config.thresholds;
  const confident = confidence >= config.confidenceThreshold;
  const signals = [];
  if (z.attempt > t.avoided) signals.push("avoided");
  if (confident && z.coverage !== null && z.coverage > t.underdeveloped) signals.push("underdeveloped");
  if (confident && z.success !== null && z.success > t.struggling) signals.push("struggling");
  if (signals.length > 0) return { classification: signals[0], signals };
  return { classification: confident ? "strong" : "insufficient_data", signals };
};

// priority = importance x total_gap
// The attempt gap is measured over the user's whole history, so it is not scaled by
// topic confidence. The other three are, and missing ones contribute 0.
export const computePriority = (z, confidence, peer) => {
  const w = config.gapWeights;
  const totalGap =
    w.attempt * (z.attempt ?? 0) +
    confidence *
      (w.success * (z.success ?? 0) +
        w.coverage * (z.coverage ?? 0) +
        w.conversion * (z.conversion ?? 0));
  const importance = peer.metrics.attemptRatio.mean;
  return { importance, totalGap, raw: importance * totalGap };
};

// Iterates over the PEER topics, so topics the user never touched are still scored.
export const scoreTopics = (userTopics, baselineDocs) => {
  const scored = [];
  for (const peer of baselineDocs) {
    const m = peer.metrics;
    if (m.attemptRatio.mean < config.minImportance) continue; // niche at this rating
    if (!usable(m.coverage.p50)) continue; // cannot recommend a difficulty

    const user = userTopics[peer.topic] ?? NO_ATTEMPTS;
    const confidence = computeConfidence(user);
    const { gaps, z } = computeGaps(user, peer);
    const { classification, signals } = classify(z, confidence);

    scored.push({
      topic: peer.topic,
      classification,
      signals,
      confidence,
      rawPriority: computePriority(z, confidence, peer).raw,
      gaps,
      recommendedDifficulty: Math.round(m.coverage.p50.mean / 100) * 100,
      peerMedianRating: Math.round(m.coverage.p50.mean),
      userMedianRating: user.coverage.p50 === null ? null : Math.round(user.coverage.p50),
    });
  }

  // Weak = has a signal AND user is behind peers overall (rawPriority > 0).
  const weak = scored
    .filter((t) => t.signals.length > 0 && t.rawPriority > 0)
    .sort((a, b) => b.rawPriority - a.rawPriority);
  const top = weak[0]?.rawPriority ?? 1;
  // priority is relative to this user's top topic (top = 100), so it is readable
  const weakTopics = weak.map((t) => ({ ...t, priority: (100 * t.rawPriority) / top }));

  return {
    weakTopics,
    strongTopics: scored.filter((t) => t.classification === "strong"),
    insufficientData: scored.filter((t) => t.classification === "insufficient_data"),
  };
};
