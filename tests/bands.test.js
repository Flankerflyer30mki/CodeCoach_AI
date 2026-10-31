import test from "node:test";
import assert from "node:assert/strict";
import { BANDS, getBand, getPeerBand } from "../shared/bands.js";

test("every rating from 800 up resolves to exactly one band", () => {
  for (let r = 800; r <= 4000; r++) {
    assert.equal(BANDS.filter((b) => r >= b.min && r < b.max).length, 1, `rating ${r}`);
    assert.ok(getBand(r));
  }
});

test("peer band is the 100-point band just above the user's band", () => {
  assert.equal(getPeerBand(1200).key, "1300-1400");
  assert.equal(getPeerBand(1299).key, "1300-1400");
  assert.equal(getPeerBand(1300).key, "1400-1500");
});

test("2300-2399 users resolve to the open-ended top band (the old lookup missed it)", () => {
  assert.equal(getPeerBand(2300).key, "2400+");
  assert.equal(getPeerBand(2399).key, "2400+");
});

test("users already in the top band have no peers above them", () => {
  assert.equal(getPeerBand(2400), null);
  assert.equal(getPeerBand(3100), null);
});

test("ratings below the lowest band clamp to the lowest band", () => {
  assert.equal(getPeerBand(790).key, "800-900");
  assert.equal(getPeerBand(400).key, "800-900");
});

test("a peer band always starts above the user (for non-clamped ratings)", () => {
  for (let r = 700; r < 2400; r++) assert.ok(getPeerBand(r).min > r, `rating ${r}`);
});
