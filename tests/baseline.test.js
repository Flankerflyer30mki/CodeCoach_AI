import test from "node:test";
import assert from "node:assert/strict";
import { computeBaseline } from "../pipeline/computeBaseline.js";

const topic = (attemptRatio, solveRate, dcr = {}) => ({
  attemptRatio,
  solveRate,
  coverage: { p10: 1000, p50: 1200, p90: 1400 },
  dcr: { bucket0_100: null, bucket100_300: null, bucket300plus: null, ...dcr },
});

test("peers who never attempted a topic count as attemptRatio 0, and are excluded from other metrics", () => {
  const peers = [{ dp: topic(0.2, 0.8) }, { greedy: topic(0.3, 0.9) }, { greedy: topic(0.3, 0.9) }, { greedy: topic(0.3, 0.9) }];
  const b = computeBaseline(peers);
  assert.equal(b.dp.attempters, 1);
  assert.equal(b.dp.attemptRatio.n, 4);
  assert.ok(Math.abs(b.dp.attemptRatio.mean - 0.05) < 1e-12); // 0.2 / 4 peers, not 0.2
  assert.equal(b.dp.solveRate.n, 1);
  assert.equal(b.dp.solveRate.mean, 0.8); // not diluted by the 3 non-attempters
});

test("unobserved DCR buckets are left out, not averaged in as 0", () => {
  const peers = [
    { dp: topic(0.1, 0.8, { bucket100_300: 0.6 }) },
    { dp: topic(0.1, 0.8, { bucket100_300: 0.4 }) },
    { dp: topic(0.1, 0.8) }, // never attempted that bucket
  ];
  const b = computeBaseline(peers);
  assert.equal(b.dp.dcr.bucket100_300.n, 2);
  assert.ok(Math.abs(b.dp.dcr.bucket100_300.mean - 0.5) < 1e-12); // old code would give 0.333
  assert.equal(b.dp.dcr.bucket300plus.n, 0);
  assert.equal(b.dp.dcr.bucket300plus.mean, null);
});
