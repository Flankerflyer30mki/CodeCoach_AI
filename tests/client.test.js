import test from "node:test";
import assert from "node:assert/strict";
import { toUiError, waitText, misconfiguredError } from "../client/src/lib/errors.js";
import { describeBaseline, formatBand, ageText, STALE_AFTER_DAYS } from "../client/src/lib/baseline.js";
import { loadingMessage } from "../client/src/lib/loading.js";

const http = (status, data, headers = {}) => ({ response: { status, data, headers } });

// every code the server can send must map to a specific, non-generic message
const SERVER_CODES = [
  "INVALID_HANDLE", "HANDLE_NOT_FOUND", "UNRATED_USER", "INSUFFICIENT_HISTORY",
  "CODEFORCES_UNAVAILABLE", "BASELINE_UNAVAILABLE", "RATE_LIMITED", "TOO_MANY_CONCURRENT",
  "SERVER_BUSY", "PAYLOAD_TOO_LARGE", "INVALID_REQUEST", "INTERNAL",
];

test("every server error code gets its own message and keeps its code", () => {
  const messages = new Set();
  for (const code of SERVER_CODES) {
    const e = toUiError(http(400, { code, error: "raw server text" }));
    assert.equal(e.code, code);
    assert.ok(e.message.length > 10);
    messages.add(e.message);
  }
  // PAYLOAD_TOO_LARGE and INVALID_REQUEST intentionally share wording
  assert.ok(messages.size >= SERVER_CODES.length - 1);
});

test("the server's raw text is not shown (except for the history message that carries counts)", () => {
  assert.ok(!toUiError(http(500, { code: "INTERNAL", error: "secret stack detail" })).message.includes("secret"));
  const e = toUiError(http(422, { code: "INSUFFICIENT_HISTORY", error: "found 7 rated problems, need at least 30" }));
  assert.ok(e.message.includes("found 7"));
});

test("retryable only for failures that may succeed later", () => {
  for (const code of ["CODEFORCES_UNAVAILABLE", "BASELINE_UNAVAILABLE", "RATE_LIMITED", "SERVER_BUSY", "TOO_MANY_CONCURRENT", "INTERNAL"]) {
    assert.equal(toUiError(http(500, { code })).retryable, true, code);
  }
  for (const code of ["INVALID_HANDLE", "HANDLE_NOT_FOUND", "UNRATED_USER", "INSUFFICIENT_HISTORY"]) {
    assert.equal(toUiError(http(400, { code })).retryable, false, code);
  }
});

test("Retry-After becomes a human wait time for limit errors only", () => {
  assert.match(toUiError(http(429, { code: "RATE_LIMITED" }, { "retry-after": "45" })).message, /about 45 seconds/);
  assert.match(toUiError(http(429, { code: "RATE_LIMITED" }, { "retry-after": "600" })).message, /about 10 minutes/);
  assert.match(toUiError(http(503, { code: "SERVER_BUSY" }, { "retry-after": "5" })).message, /about 5 seconds/);
  assert.ok(!toUiError(http(429, { code: "RATE_LIMITED" })).message.includes("about")); // header unreadable/missing
  assert.ok(!toUiError(http(404, { code: "HANDLE_NOT_FOUND" }, { "retry-after": "5" })).message.includes("about"));
  assert.equal(waitText(NaN), "");
  assert.equal(waitText(-3), "");
});

test("responses we don't recognise (proxy error pages, unknown codes) are a generic INTERNAL", () => {
  assert.equal(toUiError(http(502, "<html>Bad gateway</html>")).code, "INTERNAL");
  assert.equal(toUiError(http(500, { code: "SOMETHING_NEW" })).code, "INTERNAL");
  assert.equal(toUiError(http(500, { code: "__proto__" })).code, "INTERNAL");
});

test("no response at all: timeout vs network", () => {
  assert.equal(toUiError({ code: "ECONNABORTED" }).code, "TIMEOUT");
  assert.equal(toUiError({ code: "ETIMEDOUT" }).code, "TIMEOUT");
  assert.equal(toUiError({ code: "ERR_NETWORK", message: "Network Error" }).code, "NETWORK");
  assert.equal(toUiError(undefined).code, "NETWORK");
  assert.equal(toUiError(new Error("boom")).retryable, true);
});

test("misconfiguration is not retryable", () => {
  assert.equal(misconfiguredError().retryable, false);
});

// ---------- baseline note ----------
const NOW = Date.UTC(2026, 9, 30);
const daysBefore = (n) => new Date(NOW - n * 86400000).toISOString();

test("no baseline (top tier) -> nothing to describe", () => {
  assert.equal(describeBaseline(null, 100, NOW), null);
});

test("band and age are formatted for people", () => {
  const d = describeBaseline({ band: "1300-1400", peerCount: 300, computedAt: daysBefore(12) }, 87, NOW);
  assert.equal(d.band, "1300–1400");
  assert.equal(d.age, "12 days ago");
  assert.equal(d.peers, 300);
  assert.equal(d.historyProblems, 87);
  assert.equal(d.stale, false);
  assert.equal(formatBand("2400+"), "2400+");
  assert.equal(ageText(0), "today");
  assert.equal(ageText(1), "1 day ago");
});

test("baseline older than twice the refresh interval is flagged stale; the boundary is not", () => {
  assert.equal(describeBaseline({ band: "x", computedAt: daysBefore(STALE_AFTER_DAYS) }, 1, NOW).stale, false);
  assert.equal(describeBaseline({ band: "x", computedAt: daysBefore(STALE_AFTER_DAYS + 1) }, 1, NOW).stale, true);
});

test("bad or missing dates degrade gracefully and never claim staleness", () => {
  const d = describeBaseline({ band: "1300-1400", computedAt: "not a date" }, 1, NOW);
  assert.equal(d.ageDays, null);
  assert.equal(d.age, "at an unknown time");
  assert.equal(d.stale, false);
  assert.equal(describeBaseline({ band: "x", computedAt: daysBefore(-3) }, 1, NOW).ageDays, 0); // clock skew
});

// ---------- loading text ----------
test("loading message escalates honestly with elapsed time", () => {
  assert.match(loadingMessage(0), /10 to 30 seconds/);
  assert.match(loadingMessage(20), /Codeforces limits/);
  assert.match(loadingMessage(60), /cancel/i);
});
