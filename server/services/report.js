// Pure functions: no network, no SDKs. The LLM only EXPLAINS numbers we computed.
// Problems and links are never sent to it and never accepted back from it.

const MAX_TOPICS = 5;
const LIMITS = { summary: 700, explanation: 450, keyInsight: 450 };

const pct = (x) => Math.round(x * 100); // 0.034 -> 3 (percentage points)

// The facts the model may talk about. Everything is already rounded and in plain units.
export const buildFacts = (rating, recommendations) => ({
  rating,
  peerBand: recommendations.baseline?.band ?? null,
  weakTopics: recommendations.weakTopics.slice(0, MAX_TOPICS).map((t) => ({
    topic: t.topic,
    label: t.classification, // avoided | underdeveloped | struggling
    priority: Math.round(t.priority),
    targetDifficulty: t.recommendedDifficulty,
    yourMedianRating: t.userMedianRating, // null = never attempted
    peerMedianRating: t.peerMedianRating,
    shareOfPracticeBehindPeersPct: pct(t.gaps.attemptGap),
    solveRateBehindPeersPct: t.gaps.successGap === null ? null : pct(t.gaps.successGap),
  })),
  strongTopics: recommendations.strongTopics.slice(0, MAX_TOPICS).map((t) => t.topic),
});

// ---------- deterministic fallback copy ----------

const templateExplanation = (t) => {
  if (t.label === "avoided") {
    return `You practise ${t.topic} much less than peers one band above you.`;
  }
  if (t.label === "underdeveloped") {
    return t.yourMedianRating === null
      ? `Peers work on harder ${t.topic} problems than you do.`
      : `Your median ${t.topic} problem is rated ${t.yourMedianRating}; peers' is ${t.peerMedianRating}.`;
  }
  return `Your solve rate on ${t.topic} is below peers'.`;
};

export const templateExplanations = (facts) => ({
  summary:
    facts.weakTopics.length === 0
      ? `At ${facts.rating}, no topic stands out as clearly behind peers one band above you.`
      : `At ${facts.rating}, the largest gaps against peers one band above you are in ${facts.weakTopics
          .slice(0, 3)
          .map((t) => t.topic)
          .join(", ")}.`,
  topics: Object.fromEntries(facts.weakTopics.map((t) => [t.topic, templateExplanation(t)])),
  keyInsight:
    facts.weakTopics.length === 0
      ? "Keep your current mix and push difficulty gradually."
      : `Start with ${facts.weakTopics[0].topic}: aim for problems rated around ${facts.weakTopics[0].targetDifficulty}.`,
});

// ---------- validating model output ----------

// Every integer in the facts: ratings the model is allowed to quote.
const allowedNumbers = (facts) => {
  const found = new Set();
  const walk = (v) => {
    if (typeof v === "number") found.add(String(Math.abs(Math.round(v))));
    else if (typeof v === "string") (v.match(/\d+/g) ?? []).forEach((n) => found.add(String(Number(n))));
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(facts);
  return found;
};

// Anything that could smuggle in a link, a domain, HTML or code is rejected, not cleaned.
// The plain word "Codeforces" is fine; a link or domain is not.
const FORBIDDEN = /https?:|www\.|\]\(|<|`|\.(com|org|net|io|ru|dev|app)\b/i;
// Codeforces-style problem ids such as 77B, 1700A, 1850B1
const PROBLEM_ID = /\b\d{1,4}[A-Z]\d?\b/;

// Returns { text } when the string is safe, otherwise { reason } saying why not.
const checkText = (value, max, allowed) => {
  if (typeof value !== "string") return { reason: "missing or not text" };
  const text = value.trim();
  if (text.length === 0) return { reason: "empty" };
  if (text.length > max) return { reason: `too long (${text.length} > ${max})` };
  if (FORBIDDEN.test(text)) return { reason: "contains a link, domain, HTML or code" };
  if (PROBLEM_ID.test(text)) return { reason: "contains a problem id" };
  // any 3+ digit number must be one we supplied (blocks invented ratings)
  const invented = (text.match(/\d{3,}/g) ?? []).find((n) => !allowed.has(String(Number(n))));
  if (invented) return { reason: `quotes a number that is not in the data (${invented})` };
  return { text };
};

// Returns { summary, topics, keyInsight } with only safe strings, or null if unusable.
// Each field is checked on its own; the caller fills any gap from the template.
// onReject(reason) is called for every field that was dropped, so logs can say why.
export const validateExplanations = (parsed, facts, onReject = () => {}) => {
  if (!parsed || typeof parsed !== "object") {
    onReject("reply was not a JSON object");
    return null;
  }
  const allowed = allowedNumbers(facts);
  const known = new Set(facts.weakTopics.map((t) => t.topic));

  const topics = {};
  if (!Array.isArray(parsed.topics)) onReject('"topics" is not a list');
  for (const item of Array.isArray(parsed.topics) ? parsed.topics : []) {
    if (!item || !known.has(item.topic)) {
      onReject(`topic ${JSON.stringify(item?.topic)} is not one of the weak topics`);
      continue;
    }
    if (item.topic in topics) {
      onReject(`topic "${item.topic}" appears twice`);
      continue;
    }
    const r = checkText(item.explanation, LIMITS.explanation, allowed);
    if (r.text) topics[item.topic] = r.text;
    else onReject(`explanation for "${item.topic}": ${r.reason}`);
  }

  const summary = checkText(parsed.summary, LIMITS.summary, allowed);
  if (!summary.text) onReject(`summary: ${summary.reason}`);
  const keyInsight = checkText(parsed.keyInsight, LIMITS.keyInsight, allowed);
  if (!keyInsight.text) onReject(`keyInsight: ${keyInsight.reason}`);

  if (!summary.text && !keyInsight.text && Object.keys(topics).length === 0) return null;
  return { summary: summary.text ?? null, topics, keyInsight: keyInsight.text ?? null };
};

// ---------- rendering ----------

const ACRONYMS = new Set(["dp", "dsu", "fft", "dfs", "sat"]);
const titleCase = (s) =>
  s.replace(/[A-Za-z]+/g, (w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)));

// Frontend splits on "## Key Insight", so keep that heading.
export const renderReport = (facts, explanations) => {
  const fallback = templateExplanations(facts);
  const summary = explanations?.summary ?? fallback.summary;
  const keyInsight = explanations?.keyInsight ?? fallback.keyInsight;

  const topicBlocks = facts.weakTopics.map((t) => {
    const text = explanations?.topics?.[t.topic] ?? fallback.topics[t.topic];
    return `**${titleCase(t.topic)} (${titleCase(t.label)} — Priority ${t.priority})**\n${text} Target: ${t.targetDifficulty}-rated problems.`;
  });

  return [
    `## Profile Summary\n${summary}`,
    topicBlocks.length ? `## Weak Topics Analysis\n\n${topicBlocks.join("\n\n")}` : null,
    `## Key Insight\n${keyInsight}`,
  ]
    .filter(Boolean)
    .join("\n\n");
};

// ---------- prompt ----------

export const buildPrompt = (facts) => `You are a competitive programming coach. Explain the analysis below to the user.

Rules:
- Use ONLY the facts in the input. Do not invent numbers, ratings, problem names or links.
- Do not mention any problem, URL or link. Problems are shown to the user separately.
- Any rating you quote must appear in the input.
- "avoided" = the user rarely practises the topic compared to peers; "underdeveloped" = practises it but at lower difficulty; "struggling" = solves less often than peers.
- Be specific, encouraging and honest. Plain text only, no markdown.

Return ONLY a JSON object with exactly this shape:
{"summary": string (2-3 sentences), "topics": [{"topic": <a topic name from the input>, "explanation": string (1-2 sentences)}], "keyInsight": string (1-2 sentences)}

INPUT:
${JSON.stringify(facts, null, 2)}`;
