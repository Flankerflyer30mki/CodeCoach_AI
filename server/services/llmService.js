import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildFacts, buildPrompt, validateExplanations, renderReport } from "./report.js";

const TIMEOUT_MS = 12000;
// Model names change often (Groq retired its Llama 3.3 70B for regular accounts), so they
// can be overridden in the environment without a code change.
export const GROQ_DEFAULT_MODEL = "openai/gpt-oss-120b";
export const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";
// Reasoning models spend part of the output budget on thinking, so leave plenty of room.
const MAX_OUTPUT_TOKENS = 3000;
const MAX_CONCURRENT = 3; // per provider; beyond this we skip the provider instead of queueing
const COOLDOWN_MS = 60000; // after a 429, leave that provider alone for a minute

// gpt-oss models are reasoning models: keep the reasoning short and out of the reply.
// Other models would reject these parameters, so they are only sent to gpt-oss.
export const groqRequestExtras = (model) =>
  model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low", include_reasoning: false } : {};

// One provider = { name, call(prompt) -> raw text }. Clients are created lazily, so a
// missing key just means "provider unavailable" instead of crashing at import time.
const makeGroq = () => {
  let client;
  return {
    name: "groq",
    available: () => Boolean(process.env.GROQ_API_KEY),
    async call(prompt) {
      client ??= new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: TIMEOUT_MS, maxRetries: 0 });
      const model = process.env.GROQ_MODEL || GROQ_DEFAULT_MODEL;
      const res = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.3,
        ...groqRequestExtras(model),
      });
      const choice = res.choices[0];
      if (choice?.finish_reason === "length") console.warn("groq: reply was cut off (token limit)");
      return choice?.message?.content;
    },
  };
};

const makeGemini = () => {
  let model;
  return {
    name: "gemini",
    available: () => Boolean(process.env.GEMINI_API_KEY),
    async call(prompt) {
      model ??= new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel(
        {
          model: process.env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL,
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0.3,
          },
        },
        { timeout: TIMEOUT_MS },
      );
      const response = (await model.generateContent(prompt)).response;
      const finish = response.candidates?.[0]?.finishReason;
      if (finish && finish !== "STOP") console.warn(`gemini: finishReason ${finish}`);
      return response.text();
    },
  };
};

export const defaultProviders = () => [makeGroq(), makeGemini()];
const providers = defaultProviders();

// Per-provider state (process-local).
const state = new Map(); // name -> { active, cooldownUntil }
const stateOf = (name) => {
  if (!state.has(name)) state.set(name, { active: 0, cooldownUntil: 0 });
  return state.get(name);
};

const parseJson = (raw) => {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim());
  } catch {
    return null;
  }
};

// Try one provider. Returns validated explanations or null; never throws.
// Every way of not getting an answer is logged with its reason.
const tryProvider = async (provider, facts, prompt) => {
  const s = stateOf(provider.name);
  if (!provider.available()) {
    console.warn(`${provider.name}: skipped (no API key set)`);
    return null;
  }
  if (Date.now() < s.cooldownUntil) {
    console.warn(`${provider.name}: skipped (cooling down after a 429)`);
    return null;
  }
  if (s.active >= MAX_CONCURRENT) {
    console.warn(`${provider.name}: skipped (too many concurrent calls)`);
    return null;
  }

  s.active++;
  try {
    const raw = await provider.call(prompt);
    const parsed = parseJson(raw);
    if (!parsed) {
      console.warn(
        `${provider.name}: reply was not valid JSON (${raw?.length ?? 0} chars, starts with ${JSON.stringify(String(raw ?? "").slice(0, 120))})`,
      );
      return null;
    }
    const reasons = [];
    const explanations = validateExplanations(parsed, facts, (r) => reasons.push(r));
    if (!explanations) console.warn(`${provider.name}: reply rejected: ${reasons.join("; ") || "nothing usable"}`);
    else if (reasons.length > 0) console.warn(`${provider.name}: partly accepted, dropped: ${reasons.join("; ")}`);
    return explanations;
  } catch (err) {
    if (err?.status === 429) s.cooldownUntil = Date.now() + COOLDOWN_MS;
    console.warn(`${provider.name} failed (${err?.status ?? err?.name}): ${err?.message}`);
    return null;
  } finally {
    s.active--;
  }
};

// Always returns { text, source } and never throws.
// source: "ai" (model wording passed validation) | "template" (deterministic copy).
// Only explanation wording can come from the model; every number, label, target and
// problem comes from our own analysis.
export const generateCoachingReport = async (rating, recommendations, providerList = providers) => {
  const facts = buildFacts(rating, recommendations);

  // nothing to explain -> no model call
  if (facts.weakTopics.length > 0) {
    const prompt = buildPrompt(facts);
    for (const provider of providerList) {
      const explanations = await tryProvider(provider, facts, prompt);
      if (explanations) return { text: renderReport(facts, explanations), source: "ai" };
    }
  }
  return { text: renderReport(facts, null), source: "template" };
};
