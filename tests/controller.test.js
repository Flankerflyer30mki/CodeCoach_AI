import test, { beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { cfTiming } from "../shared/cfApi.js";

const { analyzeUser } = await import("../server/controllers/analyzeController.js");

cfTiming.minGapMs = 0;
cfTiming.backoffBaseMs = 0;

const call = async (body) => {
  const res = {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
  await analyzeUser({ body }, res);
  return res;
};
const httpError = (status, comment) =>
  Object.assign(new Error("x"), { response: { status, data: comment ? { comment } : {} } });
const ok = (result) => ({ data: { status: "OK", result } });
const solved = (n) =>
  Array.from({ length: n }, (_, i) => ({
    creationTimeSeconds: Date.now() / 1000 - 86400,
    verdict: "OK",
    problem: { contestId: i + 1, index: "A", rating: 1200, tags: ["dp"] },
  }));

let get;
beforeEach(() => { get = mock.method(axios, "get"); });
afterEach(() => mock.restoreAll());

test("missing / malformed / oversized handle -> 400, no Codeforces call", async () => {
  for (const body of [undefined, {}, { handle: 42 }, { handle: "a;b" }, { handle: "x".repeat(60) }, { handle: "  " }]) {
    const r = await call(body);
    assert.equal(r.statusCode, 400);
    assert.equal(r.body.code, "INVALID_HANDLE");
  }
  assert.equal(get.mock.callCount(), 0);
});

test("unknown handle -> 404 HANDLE_NOT_FOUND", async () => {
  get.mock.mockImplementation(async () => { throw httpError(400, "handles: User with handle zzz not found"); });
  const r = await call({ handle: "zzz" });
  assert.equal(r.statusCode, 404);
  assert.equal(r.body.code, "HANDLE_NOT_FOUND");
});

test("Codeforces down -> 502 CODEFORCES_UNAVAILABLE, not an empty report", async () => {
  get.mock.mockImplementation(async () => { throw httpError(503); });
  const r = await call({ handle: "tourist" });
  assert.equal(r.statusCode, 502);
  assert.equal(r.body.code, "CODEFORCES_UNAVAILABLE");
  assert.equal(r.body.recommendations, undefined);
});

test("Codeforces fails on submissions after user.info worked -> 502, not a fake empty analysis", async () => {
  get.mock.mockImplementation(async (url) => {
    if (url.endsWith("user.info")) return ok([{ handle: "bob", rating: 1200, rank: "pupil" }]);
    throw httpError(500);
  });
  const r = await call({ handle: "bob" });
  assert.equal(r.statusCode, 502);
});

test("unrated user -> 400 UNRATED_USER", async () => {
  get.mock.mockImplementation(async () => ok([{ handle: "new", rank: "unrated" }]));
  const r = await call({ handle: "new" });
  assert.equal(r.statusCode, 400);
  assert.equal(r.body.code, "UNRATED_USER");
});

test("valid user with too little history -> 422 INSUFFICIENT_HISTORY", async () => {
  get.mock.mockImplementation(async (url) =>
    url.endsWith("user.info") ? ok([{ handle: "bob", rating: 1200 }]) : ok(solved(5)),
  );
  const r = await call({ handle: "bob" });
  assert.equal(r.statusCode, 422);
  assert.equal(r.body.code, "INSUFFICIENT_HISTORY");
});

test("top-band user -> 200 with empty recommendations and no AI report (nobody above to compare with)", async () => {
  get.mock.mockImplementation(async (url) =>
    url.endsWith("user.info") ? ok([{ handle: "top", rating: 2600, rank: "ig" }]) : ok(solved(40)),
  );
  const r = await call({ handle: "top" });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.body.recommendations.weakTopics, []);
  assert.equal(r.body.coachingReport, null);
});
