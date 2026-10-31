import test from "node:test";
import assert from "node:assert/strict";
import { buildFacts, validateExplanations, renderReport, buildPrompt } from "../server/services/report.js";

export const recs = () => ({
  baseline: { band: "1300-1400" },
  strongTopics: [{ topic: "greedy" }],
  weakTopics: [
    {
      topic: "dp", classification: "avoided", priority: 100, recommendedDifficulty: 1500,
      userMedianRating: null, peerMedianRating: 1480, gaps: { attemptGap: 0.083, successGap: null },
      recommendedProblems: [{ name: "Secret Problem", url: "https://codeforces.com/problemset/problem/1/A" }],
    },
    {
      topic: "graphs", classification: "struggling", priority: 40.4, recommendedDifficulty: 1400,
      userMedianRating: 1250, peerMedianRating: 1420, gaps: { attemptGap: 0.01, successGap: 0.2 },
    },
  ],
});
const facts = () => buildFacts(1250, recs());

test("facts sent to the model contain no problems and no URLs", () => {
  const text = buildPrompt(facts());
  assert.ok(!/Secret Problem|codeforces\.com|recommendedProblems/.test(text));
  assert.ok(text.includes('"topic": "dp"'));
});

test("facts are rounded plain-unit numbers", () => {
  const f = facts();
  assert.equal(f.weakTopics[0].shareOfPracticeBehindPeersPct, 8);
  assert.equal(f.weakTopics[1].priority, 40);
  assert.equal(f.weakTopics[1].solveRateBehindPeersPct, 20);
  assert.equal(f.weakTopics[0].solveRateBehindPeersPct, null);
});

const good = {
  summary: "At 1250 you are behind peers in dp and graphs.",
  topics: [{ topic: "dp", explanation: "You rarely practise dp compared to peers." }],
  keyInsight: "Start dp at around 1500.",
};

test("clean output passes", () => {
  const v = validateExplanations(good, facts());
  assert.equal(v.summary, good.summary);
  assert.equal(v.topics.dp, good.topics[0].explanation);
});

test("links, html and code are rejected", () => {
  for (const bad of ["see https://evil.example", "visit www.evil.example", "[x](http://a)", "<b>hi</b>", "use `rm`", "try codeforces 1A"]) {
    const v = validateExplanations({ ...good, summary: bad, keyInsight: bad, topics: [{ topic: "dp", explanation: bad }] }, facts());
    assert.equal(v, null, bad);
  }
});

test("a rating that is not in the facts is rejected; ratings that are in the facts pass", () => {
  assert.equal(validateExplanations({ ...good, summary: "Aim for 1900 rated problems.", keyInsight: null, topics: [] }, facts()), null);
  const ok = validateExplanations({ ...good, summary: "Peers are around 1420 in graphs, you are at 1250." }, facts());
  assert.ok(ok.summary);
});

test("unknown and duplicate topics are dropped", () => {
  const v = validateExplanations(
    { ...good, topics: [{ topic: "made up", explanation: "x" }, { topic: "dp", explanation: "first" }, { topic: "dp", explanation: "second" }] },
    facts(),
  );
  assert.deepEqual(Object.keys(v.topics), ["dp"]);
  assert.equal(v.topics.dp, "first");
});

test("fields are validated independently; a bad one is null so the template fills it", () => {
  const v = validateExplanations({ ...good, keyInsight: "go to https://x.y" }, facts());
  assert.equal(v.keyInsight, null);
  assert.ok(v.summary);
});

test("garbage shapes return null", () => {
  for (const g of [null, undefined, "text", 5, [], {}, { summary: 1, topics: "no", keyInsight: {} }]) {
    assert.equal(validateExplanations(g, facts()), null);
  }
});

test("over-long text is rejected", () => {
  assert.equal(validateExplanations({ summary: "a".repeat(2000), topics: [], keyInsight: null }, facts()), null);
});

test("rendered report keeps the Key Insight heading the frontend splits on, and deterministic targets", () => {
  const md = renderReport(facts(), validateExplanations(good, facts()));
  assert.ok(md.includes("## Key Insight"));
  assert.ok(md.includes("Target: 1500-rated problems."));
  assert.ok(md.includes("DP (Avoided — Priority 100)"));
  assert.ok(md.includes("You rarely practise dp compared to peers.")); // model wording
  assert.ok(md.includes("Your solve rate on graphs is below peers'.")); // template filled the missing topic
});

test("template-only report works with no explanations", () => {
  const md = renderReport(facts(), null);
  assert.ok(md.includes("## Profile Summary") && md.includes("## Key Insight"));
  assert.ok(!md.includes("undefined") && !md.includes("null"));
});

test("report with no weak topics renders without a weak-topics section", () => {
  const f = buildFacts(1250, { baseline: { band: "x" }, weakTopics: [], strongTopics: [] });
  const md = renderReport(f, null);
  assert.ok(!md.includes("Weak Topics Analysis"));
  assert.ok(md.includes("no topic stands out"));
});

test("problem ids like 77B or 1700A are rejected", () => {
  for (const id of ["Try problem 77B.", "Solve 1700A first.", "Do 1850B1 next."]) {
    assert.equal(validateExplanations({ summary: id, topics: [], keyInsight: null }, facts()), null, id);
  }
});

// ---------- rejection reasons (so server logs can say WHY a reply was dropped) ----------
const reasonsFor = (parsed) => {
  const reasons = [];
  validateExplanations(parsed, facts(), (r) => reasons.push(r));
  return reasons;
};

test("every dropped field reports a specific reason", () => {
  const r = reasonsFor({
    summary: "see https://x.example",
    topics: [{ topic: "dp", explanation: "Aim for 2100 rated problems." }, { topic: "nope", explanation: "x" }],
    keyInsight: "a".repeat(900),
  });
  assert.ok(r.some((x) => x.startsWith("summary:") && /link/.test(x)));
  assert.ok(r.some((x) => x.includes('"dp"') && x.includes("2100")));
  assert.ok(r.some((x) => x.includes('"nope"') && /not one of the weak topics/.test(x)));
  assert.ok(r.some((x) => x.startsWith("keyInsight:") && /too long/.test(x)));
});

test("a reply that is not an object, or has no topic list, says so", () => {
  assert.ok(reasonsFor(null).some((x) => /not a JSON object/.test(x)));
  assert.ok(reasonsFor({ summary: "ok", topics: "no", keyInsight: "ok" }).some((x) => /not a list/.test(x)));
});

test("accepted fields produce no rejection reasons", () => {
  assert.deepEqual(reasonsFor(good), []);
});

test("the plain word Codeforces and the > character are fine; links and bare domains are not", () => {
  const ok = validateExplanations({ summary: "Practise more on Codeforces, ratings > 1250 help.", topics: [], keyInsight: null }, facts());
  assert.ok(ok.summary);
  for (const bad of ["go to codeforces.com/problemset", "see example.org", "read docs.dev now"]) {
    assert.equal(validateExplanations({ summary: bad, topics: [], keyInsight: null }, facts()), null, bad);
  }
});

test("replies somewhat longer than the old 350 character cap are accepted", () => {
  const long = "At 1250 you trail peers in dp. " + "You rarely practise it. ".repeat(14); // ~ 370 chars
  assert.ok(long.length > 350 && long.length < 450);
  assert.ok(validateExplanations({ summary: long, topics: [{ topic: "dp", explanation: long }], keyInsight: long }, facts()).topics.dp);
});

test("acronym topics are rendered as DP / DFS, not Dp / Dfs", () => {
  const f = buildFacts(1250, {
    baseline: { band: "1300-1400" },
    strongTopics: [],
    weakTopics: [
      { topic: "dp", classification: "avoided", priority: 100, recommendedDifficulty: 1500, userMedianRating: null, peerMedianRating: 1480, gaps: { attemptGap: 0.1, successGap: null } },
      { topic: "dfs and similar", classification: "avoided", priority: 50, recommendedDifficulty: 1500, userMedianRating: null, peerMedianRating: 1480, gaps: { attemptGap: 0.1, successGap: null } },
      { topic: "2-sat", classification: "avoided", priority: 20, recommendedDifficulty: 1500, userMedianRating: null, peerMedianRating: 1480, gaps: { attemptGap: 0.1, successGap: null } },
    ],
  });
  const md = renderReport(f, null);
  assert.ok(md.includes("**DP (Avoided"));
  assert.ok(md.includes("**DFS And Similar (Avoided"));
  assert.ok(md.includes("**2-SAT (Avoided"));
  assert.ok(!md.includes("Dp ("));
});
