import test from "node:test";
import assert from "node:assert/strict";
import { computeMetrics } from "../shared/metrics.js";
import { getPercentile, getMean, getStd, effectiveSampleSize } from "../shared/mathUtils.js";

const NOW = Date.UTC(2026, 0, 1);
const day = 86400;
const sub = (contestId, index, rating, tags, verdict, daysAgo = 1) => ({
  creationTimeSeconds: NOW / 1000 - daysAgo * day,
  verdict,
  problem: { contestId, index, rating, tags },
});

test("percentile interpolates and handles empty input", () => {
  assert.equal(getPercentile([1, 2, 3, 4], 50), 2.5);
  assert.equal(getPercentile([10], 90), 10);
  assert.equal(getPercentile([], 50), null);
  assert.equal(getMean([]), null);
  assert.equal(getStd([]), null);
});

test("effective sample size: equal weights = n, one dominant weight ~ 1", () => {
  assert.equal(effectiveSampleSize([1, 1, 1, 1]), 4);
  assert.ok(effectiveSampleSize([1, 0.001, 0.001]) < 1.01);
});

test("several submissions on one problem collapse to ONE problem; solved if any is OK", () => {
  const { topics, totalProblems, solvedSet } = computeMetrics(
    [sub(1, "A", 1200, ["dp"], "WRONG_ANSWER"), sub(1, "A", 1200, ["dp"], "WRONG_ANSWER"), sub(1, "A", 1200, ["dp"], "OK")],
    1200,
    NOW,
  );
  assert.equal(totalProblems, 1);
  assert.equal(topics.dp.problemCount, 1);
  assert.equal(topics.dp.solveRate, 1);
  assert.ok(solvedSet.has("1-A"));
});

test("compile errors and unrated problems are ignored", () => {
  const { totalProblems } = computeMetrics(
    [sub(1, "A", 1200, ["dp"], "COMPILATION_ERROR"), sub(2, "A", undefined, ["dp"], "OK")],
    1200,
    NOW,
  );
  assert.equal(totalProblems, 0);
});

test("DCR bucket with no attempts is null, not 0", () => {
  const { topics } = computeMetrics([sub(1, "A", 1250, ["dp"], "OK")], 1200, NOW); // +50 -> bucket0_100
  assert.equal(topics.dp.dcr.bucket0_100, 1);
  assert.equal(topics.dp.dcr.bucket100_300, null);
  assert.equal(topics.dp.dcr.bucket300plus, null);
});

test("DCR rates are per bucket", () => {
  const { topics } = computeMetrics(
    [sub(1, "A", 1350, ["dp"], "OK"), sub(2, "A", 1350, ["dp"], "WRONG_ANSWER")], // both +150
    1200,
    NOW,
  );
  assert.equal(topics.dp.dcr.bucket100_300, 0.5);
});

test("multi-tag problem counts once in each of its topics, once overall", () => {
  const { topics, totalProblems } = computeMetrics([sub(1, "A", 1200, ["dp", "math"], "OK")], 1200, NOW);
  assert.equal(totalProblems, 1);
  assert.equal(topics.dp.problemCount, 1);
  assert.equal(topics.math.problemCount, 1);
  assert.equal(topics.dp.attemptRatio, 1);
});

test("recent problems weigh more: attemptRatio follows the recent topic", () => {
  const { topics } = computeMetrics(
    [sub(1, "A", 1200, ["dp"], "OK", 400), sub(2, "A", 1200, ["greedy"], "OK", 1)],
    1200,
    NOW,
  );
  assert.ok(topics.greedy.attemptRatio > topics.dp.attemptRatio);
});

test("empty history gives empty metrics, not a crash", () => {
  const r = computeMetrics([], 1200, NOW);
  assert.equal(r.totalProblems, 0);
  assert.deepEqual(r.topics, {});
});
