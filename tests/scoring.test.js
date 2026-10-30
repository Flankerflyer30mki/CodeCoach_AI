import test from "node:test";
import assert from "node:assert/strict";
import config from "../shared/analyticsConfig.js";
import { computeConfidence, computeGaps, classify, computePriority, scoreTopics } from "../server/services/scoring.js";

const N = 300;
const stat = (mean, std, n = N) => ({ mean, std, n });

// A peer baseline doc with sensible defaults; override per test.
const peerDoc = (topic, m = {}) => ({
  topic,
  metrics: {
    attemptRatio: stat(0.1, 0.05),
    solveRate: stat(0.7, 0.1, 250),
    coverage: { p10: stat(1000, 100, 250), p50: stat(1300, 100, 250), p90: stat(1600, 100, 250) },
    dcr: {
      bucket0_100: stat(0.6, 0.1, 200),
      bucket100_300: stat(0.4, 0.1, 150),
      bucket300plus: stat(0.1, 0.1, 40),
    },
    ...m,
  },
});

const NO_DCR = { bucket0_100: null, bucket100_300: null, bucket300plus: null };
const userTopic = (o = {}) => ({
  problemCount: 20,
  effectiveN: 20,
  attemptRatio: 0.1,
  solveRate: 0.7,
  coverage: { p10: 1000, p50: 1300, p90: 1600 },
  dcr: { bucket0_100: 0.6, bucket100_300: 0.4, bucket300plus: 0.1 },
  ...o,
});

test("a topic the user NEVER attempted is still scored and flagged avoided", () => {
  const r = scoreTopics({}, [peerDoc("dp")]); // user has no dp at all
  assert.equal(r.weakTopics.length, 1);
  assert.equal(r.weakTopics[0].topic, "dp");
  assert.equal(r.weakTopics[0].classification, "avoided");
  assert.ok(r.weakTopics[0].priority > 0);
  assert.equal(r.weakTopics[0].userMedianRating, null);
});

test("niche topics (peers barely practise them) are skipped", () => {
  const niche = peerDoc("2-sat", { attemptRatio: stat(0.005, 0.01) });
  const r = scoreTopics({}, [niche]);
  assert.equal(r.weakTopics.length + r.strongTopics.length + r.insufficientData.length, 0);
});

test("a user matching peers is strong", () => {
  const r = scoreTopics({ dp: userTopic() }, [peerDoc("dp")]);
  assert.equal(r.strongTopics.length, 1);
  assert.equal(r.weakTopics.length, 0);
});

test("a user ahead of peers is never listed as weak", () => {
  const ahead = userTopic({ attemptRatio: 0.3, solveRate: 0.95, coverage: { p10: 1300, p50: 1600, p90: 1900 } });
  assert.equal(scoreTopics({ dp: ahead }, [peerDoc("dp")]).weakTopics.length, 0);
});

test("zero peer std cannot produce NaN or Infinity", () => {
  const flat = peerDoc("dp", {
    attemptRatio: stat(0.1, 0),
    solveRate: stat(0.7, 0, 250),
    coverage: { p10: stat(1000, 0, 250), p50: stat(1300, 0, 250), p90: stat(1600, 0, 250) },
  });
  const { gaps, z } = computeGaps(userTopic({ solveRate: 0.1, coverage: { p10: 800, p50: 900, p90: 1000 } }), flat);
  for (const v of [...Object.values(z), ...Object.values(gaps)]) assert.ok(Number.isFinite(v));
  for (const v of Object.values(z)) assert.ok(Math.abs(v) <= config.zClip);
});

test("coverage (rating points) no longer dominates: z-scores are bounded on the same scale as the other gaps", () => {
  const peer = peerDoc("dp");
  const base = computeGaps(userTopic(), peer).z;
  const huge = computeGaps(userTopic({ coverage: { p10: 500, p50: 600, p90: 700 } }), peer).z; // 900 points behind
  assert.equal(huge.coverage, config.zClip);
  assert.equal(huge.attempt, base.attempt); // other components unaffected
  // old formula: 0.25 * 900 = 225 from coverage alone vs ~0.0x from everything else
  const prio = computePriority(huge, 1, peer).totalGap;
  assert.ok(prio < 1.0, `total gap ${prio} should be O(1)`);
});

test("sensitivity: a larger success gap (all else equal) gives a higher priority", () => {
  const peer = peerDoc("dp");
  const prio = (solveRate) => {
    const u = userTopic({ solveRate });
    const { z } = computeGaps(u, peer);
    return computePriority(z, computeConfidence(u), peer).raw;
  };
  assert.ok(prio(0.4) > prio(0.55));
  assert.ok(prio(0.55) > prio(0.7));
});

test("sensitivity: a larger attempt gap (all else equal) gives a higher priority", () => {
  const peer = peerDoc("dp");
  const prio = (attemptRatio) => {
    const u = userTopic({ attemptRatio });
    const { z } = computeGaps(u, peer);
    return computePriority(z, computeConfidence(u), peer).raw;
  };
  assert.ok(prio(0.0) > prio(0.05));
  assert.ok(prio(0.05) > prio(0.1));
});

test("missing DCR data (user never tried those buckets) is excluded, not treated as failure", () => {
  const { gaps, z } = computeGaps(userTopic({ dcr: NO_DCR }), peerDoc("dp"));
  assert.equal(gaps.conversionGap, null);
  assert.equal(z.conversion, null);
});

test("DCR bucket backed by too few peers is ignored", () => {
  const thin = peerDoc("dp");
  for (const b of Object.keys(NO_DCR)) thin.metrics.dcr[b] = stat(0.9, 0.1, 3);
  assert.equal(computeGaps(userTopic(), thin).gaps.conversionGap, null);
});

test("conflicting signals are all reported; precedence only picks the display label", () => {
  const u = userTopic({ attemptRatio: 0, solveRate: 0.1, effectiveN: 10 });
  const { z } = computeGaps(u, peerDoc("dp"));
  const { classification, signals } = classify(z, computeConfidence(u));
  assert.ok(signals.includes("avoided") && signals.includes("struggling"));
  assert.equal(classification, "avoided");
});

test("signal thresholds: exactly at the threshold does not fire, just above does", () => {
  assert.deepEqual(classify({ attempt: 1.0, success: null, coverage: null }, 1).signals, []);
  assert.deepEqual(classify({ attempt: 1.01, success: null, coverage: null }, 1).signals, ["avoided"]);
});

test("low-confidence data can't be called strong, and can't claim struggling/underdeveloped", () => {
  const z = { attempt: 0, success: 3, coverage: 3 };
  assert.equal(classify(z, 0.1).classification, "insufficient_data");
  assert.deepEqual(classify(z, 0.1).signals, []);
});

test("confidence is effective sample size / target, capped at 1", () => {
  assert.equal(computeConfidence({ effectiveN: 5 }), 5 / config.minEffectiveAttempts);
  assert.equal(computeConfidence({ effectiveN: 500 }), 1);
  assert.equal(computeConfidence({ effectiveN: 0 }), 0);
});

test("priorities are relative: top weak topic = 100, sorted descending, all positive", () => {
  const docs = [peerDoc("dp"), peerDoc("graphs"), peerDoc("math")];
  const user = { graphs: userTopic({ solveRate: 0.4 }), math: userTopic() }; // dp never attempted
  const { weakTopics } = scoreTopics(user, docs);
  assert.equal(weakTopics[0].priority, 100);
  for (let i = 1; i < weakTopics.length; i++) assert.ok(weakTopics[i - 1].priority >= weakTopics[i].priority);
  assert.ok(weakTopics.every((t) => t.priority > 0));
});
