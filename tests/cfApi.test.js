import test, { beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { getUserInfo, getUserSubmissions, CfError, cfTiming } from "../shared/cfApi.js";

cfTiming.minGapMs = 0;
cfTiming.backoffBaseMs = 0;

const httpError = (status, comment) =>
  Object.assign(new Error(`Request failed with status ${status}`), {
    response: { status, data: comment ? { status: "FAILED", comment } : {} },
  });
const ok = (result) => ({ data: { status: "OK", result } });

let get;
beforeEach(() => {
  get = mock.method(axios, "get");
});
afterEach(() => mock.restoreAll());

test("a valid empty history is returned as an empty array", async () => {
  get.mock.mockImplementation(async () => ok([]));
  assert.deepEqual(await getUserSubmissions("someone"), []);
});

test("Codeforces 5xx on every attempt THROWS (it is not turned into an empty history)", async () => {
  get.mock.mockImplementation(async () => {
    throw httpError(503);
  });
  await assert.rejects(getUserSubmissions("someone"), (e) => e instanceof CfError && e.kind === "unavailable");
  assert.equal(get.mock.callCount(), 3); // bounded retries, no storm
});

test("timeouts / network errors are retried then surface as unavailable", async () => {
  get.mock.mockImplementation(async () => {
    throw new Error("timeout of 15000ms exceeded"); // no err.response
  });
  await assert.rejects(getUserInfo("someone"), (e) => e.kind === "unavailable");
  assert.equal(get.mock.callCount(), 3);
});

test("a transient failure followed by success recovers", async () => {
  let n = 0;
  get.mock.mockImplementation(async () => {
    if (++n === 1) throw httpError(429);
    return ok([{ handle: "x", rating: 1200 }]);
  });
  assert.equal((await getUserInfo("x")).rating, 1200);
  assert.equal(get.mock.callCount(), 2);
});

test("an unknown handle is not_found and is NOT retried", async () => {
  get.mock.mockImplementation(async () => {
    throw httpError(400, "handles: User with handle nobody not found");
  });
  await assert.rejects(getUserInfo("nobody"), (e) => e instanceof CfError && e.kind === "not_found");
  assert.equal(get.mock.callCount(), 1);
});

test("other 4xx errors are not retried", async () => {
  get.mock.mockImplementation(async () => {
    throw httpError(403);
  });
  await assert.rejects(getUserInfo("x"), (e) => e.kind === "unavailable");
  assert.equal(get.mock.callCount(), 1);
});

test("HTTP 200 with status FAILED is treated as a failure, not as data", async () => {
  get.mock.mockImplementation(async () => ({ data: { status: "FAILED", comment: "something broke" } }));
  await assert.rejects(getUserSubmissions("x"), (e) => e.kind === "unavailable");
});
