import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";
import { createAdmission } from "../server/middleware.js";
import { loadConfig, validateConfig } from "../server/config.js";

const baseConfig = (over = {}) => ({
  ...loadConfig({ MONGO_URI: "x", GROQ_API_KEY: "k" }),
  allowedOrigins: ["https://good.example"],
  rateLimit: { windowMs: 60000, max: 100 },
  maxConcurrentAnalyses: 5,
  maxConcurrentPerClient: 5,
  ...over,
});

const servers = [];
const start = async (opts) => {
  const server = createApp(opts).listen(0);
  servers.push(server);
  await new Promise((r) => server.once("listening", r));
  return `http://127.0.0.1:${server.address().port}`;
};
after(() => servers.forEach((s) => s.close()));

const post = (url, body, headers = {}) =>
  fetch(`${url}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const okAnalyze = (req, res) => res.json({ ok: true });

// ---------- health ----------
test("liveness is always 200; readiness follows the readiness check", async () => {
  let ready = true;
  const url = await start({ config: baseConfig(), analyze: okAnalyze, readiness: async () => ({ ready, checks: { db: ready } }) });
  assert.equal((await fetch(`${url}/health/live`)).status, 200);
  assert.equal((await fetch(`${url}/health/ready`)).status, 200);
  ready = false;
  assert.equal((await fetch(`${url}/health/ready`)).status, 503);
  assert.equal((await fetch(`${url}/health/live`)).status, 200); // still alive
});

test("a throwing readiness check is a 503 with no error detail leaked", async () => {
  const url = await start({ config: baseConfig(), analyze: okAnalyze, readiness: async () => { throw new Error("mongodb://secret@host failed"); } });
  const res = await fetch(`${url}/health/ready`);
  assert.equal(res.status, 503);
  assert.ok(!(await res.text()).includes("secret"));
});

// ---------- rate limiting ----------
test("inbound rate limit: over the limit -> 429 RATE_LIMITED with Retry-After; health is never limited", async () => {
  const url = await start({ config: baseConfig({ rateLimit: { windowMs: 60000, max: 3 } }), analyze: okAnalyze });
  for (let i = 0; i < 3; i++) assert.equal((await post(url, { handle: "abc" })).status, 200);
  const blocked = await post(url, { handle: "abc" });
  assert.equal(blocked.status, 429);
  assert.equal((await blocked.json()).code, "RATE_LIMITED");
  assert.ok(Number(blocked.headers.get("retry-after")) > 0);
  assert.equal((await fetch(`${url}/health/live`)).status, 200);
});

// ---------- work admission ----------
const slowHandler = () => {
  let release;
  const gate = new Promise((r) => (release = r));
  return { release: () => release(), handler: async (req, res) => { await gate; res.json({ ok: true }); } };
};

test("global cap: extra analyses get 503 SERVER_BUSY with Retry-After, then capacity returns", async () => {
  const slow = slowHandler();
  const url = await start({ config: baseConfig({ maxConcurrentAnalyses: 2 }), analyze: slow.handler });
  const inflight = [post(url, { handle: "a" }), post(url, { handle: "b" })];
  await new Promise((r) => setTimeout(r, 50));
  const rejected = await post(url, { handle: "c" });
  assert.equal(rejected.status, 503);
  assert.equal((await rejected.json()).code, "SERVER_BUSY");
  assert.ok(rejected.headers.get("retry-after"));
  slow.release();
  assert.deepEqual((await Promise.all(inflight)).map((r) => r.status), [200, 200]);
  assert.equal((await post(url, { handle: "d" })).status, 200); // slot freed
});

test("per-client cap: one IP cannot run more than its share concurrently", async () => {
  const slow = slowHandler();
  const url = await start({ config: baseConfig({ maxConcurrentPerClient: 1 }), analyze: slow.handler });
  const first = post(url, { handle: "a" });
  await new Promise((r) => setTimeout(r, 50));
  const second = await post(url, { handle: "b" });
  assert.equal(second.status, 429);
  assert.equal((await second.json()).code, "TOO_MANY_CONCURRENT");
  slow.release();
  assert.equal((await first).status, 200);
});

test("a handler that throws still releases its slot", async () => {
  const admission = createAdmission({ maxTotal: 1, maxPerClient: 1 });
  const wrapped = admission.wrap(async () => { throw new Error("boom"); });
  await assert.rejects(wrapped({ ip: "1.1.1.1" }, {}, () => {}), /boom/);
  assert.equal(admission.active(), 0);
});

// ---------- CORS / headers / body ----------
test("CORS: allowed origin gets the header, others do not", async () => {
  const url = await start({ config: baseConfig(), analyze: okAnalyze });
  const good = await post(url, { handle: "abc" }, { Origin: "https://good.example" });
  assert.equal(good.headers.get("access-control-allow-origin"), "https://good.example");
  const bad = await post(url, { handle: "abc" }, { Origin: "https://evil.example" });
  assert.equal(bad.headers.get("access-control-allow-origin"), null);
});

test("CORS preflight is answered for the allowed origin only", async () => {
  const url = await start({ config: baseConfig(), analyze: okAnalyze });
  const pre = (origin) => fetch(`${url}/api/analyze`, { method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" } });
  assert.equal((await pre("https://good.example")).headers.get("access-control-allow-origin"), "https://good.example");
  assert.equal((await pre("https://evil.example")).headers.get("access-control-allow-origin"), null);
});

test("security headers are set and x-powered-by is gone", async () => {
  const url = await start({ config: baseConfig(), analyze: okAnalyze });
  const res = await fetch(`${url}/health/live`);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("x-powered-by"), null);
});

test("oversized body -> 413 JSON; malformed JSON -> 400 JSON; neither leaks internals", async () => {
  const url = await start({ config: baseConfig(), analyze: okAnalyze });
  const big = await post(url, { handle: "a".repeat(5000) });
  assert.equal(big.status, 413);
  assert.equal((await big.json()).code, "PAYLOAD_TOO_LARGE");
  const bad = await post(url, "{not json");
  assert.equal(bad.status, 400);
  const body = await bad.json();
  assert.equal(body.code, "INVALID_REQUEST");
  assert.ok(!JSON.stringify(body).includes("Unexpected token"));
});

test("unknown routes -> JSON 404", async () => {
  const url = await start({ config: baseConfig(), analyze: okAnalyze });
  const res = await fetch(`${url}/nope`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).code, "NOT_FOUND");
});

test("an unexpected handler error becomes a generic 500 JSON with no message leak", async () => {
  const url = await start({ config: baseConfig(), analyze: async () => { throw new Error("db password is hunter2"); } });
  const res = await post(url, { handle: "abc" });
  assert.equal(res.status, 500);
  assert.ok(!(await res.text()).includes("hunter2"));
});

// ---------- config ----------
test("config: missing MONGO_URI is a startup error; missing LLM keys and TRUST_PROXY=0 are warnings", () => {
  const { errors, warnings } = validateConfig(loadConfig({}));
  assert.ok(errors.some((e) => e.includes("MONGO_URI")));
  assert.ok(warnings.some((w) => w.includes("GROQ_API_KEY")));
  assert.ok(warnings.some((w) => w.includes("TRUST_PROXY")));
  assert.deepEqual(validateConfig(loadConfig({ MONGO_URI: "x", GROQ_API_KEY: "k", TRUST_PROXY: "1" })), { errors: [], warnings: [] });
});

test("config: env values are parsed, bad numbers fall back to defaults, origins are a trimmed list", () => {
  const c = loadConfig({ ALLOWED_ORIGINS: " https://a.example , https://b.example ", RATE_LIMIT_MAX: "abc", TRUST_PROXY: "1" });
  assert.deepEqual(c.allowedOrigins, ["https://a.example", "https://b.example"]);
  assert.equal(c.rateLimit.max, 10);
  assert.equal(c.trustProxy, 1);
});

// ---------- proxy handling ----------
test("TRUST_PROXY=0: a spoofed X-Forwarded-For does NOT get a fresh rate-limit bucket", async () => {
  const url = await start({ config: baseConfig({ trustProxy: 0, rateLimit: { windowMs: 60000, max: 1 } }), analyze: okAnalyze });
  assert.equal((await post(url, { handle: "abc" }, { "X-Forwarded-For": "1.1.1.1" })).status, 200);
  assert.equal((await post(url, { handle: "abc" }, { "X-Forwarded-For": "2.2.2.2" })).status, 429);
});

test("TRUST_PROXY=1: clients behind the proxy are limited separately by their forwarded IP", async () => {
  const url = await start({ config: baseConfig({ trustProxy: 1, rateLimit: { windowMs: 60000, max: 1 } }), analyze: okAnalyze });
  assert.equal((await post(url, { handle: "abc" }, { "X-Forwarded-For": "1.1.1.1" })).status, 200);
  assert.equal((await post(url, { handle: "abc" }, { "X-Forwarded-For": "2.2.2.2" })).status, 200);
  assert.equal((await post(url, { handle: "abc" }, { "X-Forwarded-For": "1.1.1.1" })).status, 429);
});

test("CORS exposes Retry-After so a browser on another origin can read it", async () => {
  const url = await start({ config: baseConfig({ rateLimit: { windowMs: 60000, max: 1 } }), analyze: okAnalyze });
  await post(url, { handle: "abc" }, { Origin: "https://good.example" });
  const blocked = await post(url, { handle: "abc" }, { Origin: "https://good.example" });
  assert.equal(blocked.status, 429);
  assert.match(blocked.headers.get("access-control-expose-headers") ?? "", /Retry-After/i);
});
