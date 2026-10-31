import test from "node:test";
import assert from "node:assert/strict";
import { generateCoachingReport } from "../server/services/llmService.js";
import { recs } from "./report.test.js";

let n = 0;
const provider = (call, name = `fake${++n}`) => ({ name, available: () => true, call });
const goodJson = JSON.stringify({
  summary: "At 1250 you trail peers in dp and graphs.",
  topics: [{ topic: "dp", explanation: "You rarely practise dp." }, { topic: "graphs", explanation: "You solve fewer graph problems than peers." }],
  keyInsight: "Start with dp around 1500.",
});

test("importing and running with NO api keys neither crashes nor throws: template report", async () => {
  delete process.env.GROQ_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const r = await generateCoachingReport(1250, recs());
  assert.equal(r.source, "template");
  assert.ok(r.text.includes("## Key Insight"));
});

test("valid model output -> source ai, with deterministic targets intact", async () => {
  const r = await generateCoachingReport(1250, recs(), [provider(async () => goodJson)]);
  assert.equal(r.source, "ai");
  assert.ok(r.text.includes("You rarely practise dp."));
  assert.ok(r.text.includes("Target: 1500-rated problems."));
});

test("JSON wrapped in a code fence is accepted", async () => {
  const r = await generateCoachingReport(1250, recs(), [provider(async () => "```json\n" + goodJson + "\n```")]);
  assert.equal(r.source, "ai");
});

test("both providers failing still returns a full deterministic report", async () => {
  const boom = async () => { throw new Error("down"); };
  const r = await generateCoachingReport(1250, recs(), [provider(boom), provider(boom)]);
  assert.equal(r.source, "template");
  assert.ok(r.text.includes("Target: 1500-rated problems."));
  assert.ok(r.text.includes("Target: 1400-rated problems."));
});

test("an invalid first answer falls through to the second provider", async () => {
  const bad = provider(async () => JSON.stringify({ summary: "go to https://evil.example", topics: [], keyInsight: "x https://y.z" }));
  const second = provider(async () => goodJson);
  const r = await generateCoachingReport(1250, recs(), [bad, second]);
  assert.equal(r.source, "ai");
  assert.ok(!r.text.includes("evil.example"));
});

test("non-JSON answers are treated as failure", async () => {
  const r = await generateCoachingReport(1250, recs(), [provider(async () => "Sure! Here is your report...")]);
  assert.equal(r.source, "template");
});

test("a model that invents a rating or a link never reaches the output", async () => {
  const sneaky = JSON.stringify({
    summary: "You should solve 2100 rated problems, see https://codeforces.com/problemset/problem/9/Z",
    topics: [{ topic: "dp", explanation: "Do problem 77B Fake Problem now." }],
    keyInsight: "Aim for 2100.",
  });
  const r = await generateCoachingReport(1250, recs(), [provider(async () => sneaky)]);
  assert.ok(!/2100|Fake Problem|problem\/9\/Z/.test(r.text));
});

test("nothing to explain -> no model call at all", async () => {
  let called = 0;
  const empty = { baseline: { band: "1300-1400" }, weakTopics: [], strongTopics: [] };
  const r = await generateCoachingReport(1250, empty, [provider(async () => { called++; return goodJson; })]);
  assert.equal(called, 0);
  assert.equal(r.source, "template");
});

test("a 429 puts that provider on cooldown instead of hammering it", async () => {
  let calls = 0;
  const limited = provider(async () => { calls++; throw Object.assign(new Error("rate limited"), { status: 429 }); }, "cooldown-test");
  await generateCoachingReport(1250, recs(), [limited]);
  await generateCoachingReport(1250, recs(), [limited]);
  await generateCoachingReport(1250, recs(), [limited]);
  assert.equal(calls, 1);
});

test("provider concurrency is capped: extra callers skip the provider instead of piling on", async () => {
  let active = 0, peak = 0, started = 0;
  let release;
  const gate = new Promise((r) => (release = r));
  const slow = provider(async () => { started++; active++; peak = Math.max(peak, active); await gate; active--; return goodJson; }, "cap-test");
  const runs = Array.from({ length: 6 }, () => generateCoachingReport(1250, recs(), [slow]));
  await new Promise((r) => setTimeout(r, 20));
  release();
  const results = await Promise.all(runs);
  assert.equal(peak, 3);
  assert.equal(started, 3);
  assert.equal(results.filter((r) => r.source === "ai").length, 3);
  assert.equal(results.filter((r) => r.source === "template").length, 3); // still got a full report
});
