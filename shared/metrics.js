import { getWeight, getPercentile, effectiveSampleSize } from "./mathUtils.js";
import { getDcrBucket } from "./dcrUtils.js";

// Not real attempts at the problem
const IGNORED_VERDICTS = new Set(["COMPILATION_ERROR", "SKIPPED", "TESTING"]);

// Used for BOTH the user and every peer, so they are measured identically.
// Unit of analysis = one problem (8 wrong tries then AC is ONE solved problem).
// A problem with several tags counts once in each of its topics.
//
// Missing data is null, never 0: "no attempts" is not "attempted and failed".
export const computeMetrics = (submissions, rating, now = Date.now()) => {
  const problems = new Map();
  for (const s of submissions) {
    const { contestId, index, rating: problemRating, tags } = s.problem;
    if (!problemRating || IGNORED_VERDICTS.has(s.verdict)) continue;
    const key = `${contestId}-${index}`;
    const p = problems.get(key) ?? {
      rating: problemRating,
      tags,
      firstTime: s.creationTimeSeconds,
      solved: false,
    };
    p.firstTime = Math.min(p.firstTime, s.creationTimeSeconds);
    p.solved = p.solved || s.verdict === "OK";
    problems.set(key, p);
  }

  const solvedSet = new Set();
  const raw = {};
  let totalWeight = 0;

  for (const [key, p] of problems) {
    const w = getWeight(p.firstTime, now);
    totalWeight += w;
    if (p.solved) solvedSet.add(key);
    const bucket = getDcrBucket(p.rating - rating);

    for (const tag of p.tags) {
      const t = (raw[tag] ??= {
        weights: [],
        solvedWeight: 0,
        ratings: [],
        dcr: {
          bucket0_100: { attempted: 0, solved: 0 },
          bucket100_300: { attempted: 0, solved: 0 },
          bucket300plus: { attempted: 0, solved: 0 },
        },
      });
      t.weights.push(w);
      t.ratings.push(p.rating);
      if (p.solved) t.solvedWeight += w;
      if (bucket) {
        t.dcr[bucket].attempted += w;
        if (p.solved) t.dcr[bucket].solved += w;
      }
    }
  }

  const rate = (b) => (b.attempted > 0 ? b.solved / b.attempted : null);
  const topics = {};
  for (const tag in raw) {
    const t = raw[tag];
    const weightedAttempts = t.weights.reduce((a, b) => a + b, 0);
    topics[tag] = {
      problemCount: t.weights.length,
      effectiveN: effectiveSampleSize(t.weights),
      attemptRatio: weightedAttempts / totalWeight,
      solveRate: t.solvedWeight / weightedAttempts,
      coverage: {
        p10: getPercentile(t.ratings, 10),
        p50: getPercentile(t.ratings, 50),
        p90: getPercentile(t.ratings, 90),
      },
      dcr: {
        bucket0_100: rate(t.dcr.bucket0_100),
        bucket100_300: rate(t.dcr.bucket100_300),
        bucket300plus: rate(t.dcr.bucket300plus),
      },
    };
  }

  return { topics, totalProblems: problems.size, solvedSet };
};
