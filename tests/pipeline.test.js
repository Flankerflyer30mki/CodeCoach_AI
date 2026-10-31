import test from "node:test";
import assert from "node:assert/strict";
import { makeRng, shuffle } from "../pipeline/sampling.js";
import { computeMetrics } from "../shared/metrics.js";
import { computeBaseline } from "../pipeline/computeBaseline.js";
import { scoreTopics } from "../server/services/scoring.js";

test("same seed reproduces the same sample; different seed gives a different one", () => {
  const ids = Array.from({ length: 100 }, (_, i) => i);
  assert.deepEqual(shuffle(ids, makeRng(7)), shuffle(ids, makeRng(7)));
  assert.notDeepEqual(shuffle(ids, makeRng(7)), shuffle(ids, makeRng(8)));
});

test("sampling a rating-sorted band is not biased to its top end (old code took slice(0, 300))", () => {
  // ratedList comes sorted by rating, high to low
  const band = Array.from({ length: 900 }, (_, i) => ({ rating: 1399 - Math.floor(i / 9) }));
  const mean = (a) => a.reduce((s, u) => s + u.rating, 0) / a.length;
  const oldWay = mean(band.slice(0, 300));
  const newWay = mean(shuffle(band, makeRng(1)).slice(0, 300));
  const trueMean = mean(band);
  assert.ok(Math.abs(newWay - trueMean) < 5, `new ${newWay} vs true ${trueMean}`);
  assert.ok(Math.abs(oldWay - trueMean) > 20, `old way was off by ${Math.abs(oldWay - trueMean)}`);
});

// ---- end to end: raw submissions -> metrics -> baseline -> scoring ----
const NOW = Date.UTC(2026, 0, 1);
const subs = (spec, rating) => {
  // spec: { tag: count }; problems at rating+150, ~70% solved, deterministic
  const out = [];
  let id = 1;
  for (const [tag, count] of Object.entries(spec)) {
    for (let i = 0; i < count; i++) {
      out.push({
        creationTimeSeconds: NOW / 1000 - (i + 1) * 86400,
        verdict: i % 10 < 7 ? "OK" : "WRONG_ANSWER",
        problem: { contestId: id++, index: "A", rating: rating + 150, tags: [tag] },
      });
    }
  }
  return out;
};

test("end to end: a user who skips dp (peers do it a lot) gets dp as the top weak topic", () => {
  const peers = Array.from({ length: 40 }, () => computeMetrics(subs({ dp: 30, greedy: 30, math: 20 }, 1350), 1350, NOW).topics);
  const baseline = computeBaseline(peers);
  const docs = Object.entries(baseline).map(([topic, metrics]) => ({ topic, metrics }));

  const user = computeMetrics(subs({ greedy: 50, math: 30 }, 1250), 1250, NOW);
  const { weakTopics, strongTopics } = scoreTopics(user.topics, docs);

  assert.equal(weakTopics[0].topic, "dp");
  assert.equal(weakTopics[0].classification, "avoided");
  assert.equal(weakTopics[0].priority, 100);
  assert.ok(!strongTopics.some((t) => t.topic === "dp"));
});
