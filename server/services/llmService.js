import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildFacts, buildPrompt, validateExplanations, renderReport } from "./report.js";

const TIMEOUT_MS = 12000;
const MAX_CONCURRENT = 3; // per provider; beyond this we skip the provider instead of queueing
const COOLDOWN_MS = 60000; // after a 429, leave that provider alone for a minute

// One provider = { name, call(prompt) -> raw text }. Clients are created lazily, so a
// missing key just means "provider unavailable" instead of crashing at import time.
const makeGroq = () => {
  let client;
  return {
    name: "groq",
    available: () => Boolean(process.env.GROQ_API_KEY),
    async call(prompt) {
      client ??= new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: TIMEOUT_MS, maxRetries: 0 });
      const res = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 800,
        temperature: 0.3,
      });
      return res.choices[0]?.message?.content;
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
          model: "gemini-2.5-flash",
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 800, temperature: 0.3 },
        },
        { timeout: TIMEOUT_MS },
      );
      return (await model.generateContent(prompt)).response.text();
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
const tryProvider = async (provider, facts, prompt) => {
  const s = stateOf(provider.name);
  if (!provider.available()) return null;
  if (Date.now() < s.cooldownUntil) return null;
  if (s.active >= MAX_CONCURRENT) return null;

  s.active++;
  try {
    const explanations = validateExplanations(parseJson(await provider.call(prompt)), facts);
    if (!explanations) console.warn(`${provider.name}: output failed validation`);
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
