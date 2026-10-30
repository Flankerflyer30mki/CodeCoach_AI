import config from "./analyticsConfig.js";

const DAY_MS = 1000 * 60 * 60 * 24;

const getWeight = (creationTimeSeconds, now = Date.now()) => {
  const ageDays = (now - creationTimeSeconds * 1000) / DAY_MS;
  return Math.exp(-config.lambda * ageDays);
};

// Linear-interpolated percentile (same as numpy default). null for empty input.
const getPercentile = (arr, p) => {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = ((sorted.length - 1) * p) / 100;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
};

const getMean = (arr) =>
  arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length;

// Population std. null for empty input.
const getStd = (arr) => {
  if (arr.length === 0) return null;
  const mean = getMean(arr);
  return Math.sqrt(getMean(arr.map((x) => (x - mean) ** 2)));
};

// Kish effective sample size: how many equally-weighted observations the
// decayed weights are worth. 10 recent problems -> ~10, 10 year-old ones -> far less.
const effectiveSampleSize = (weights) => {
  if (weights.length === 0) return 0;
  const sum = weights.reduce((a, b) => a + b, 0);
  const sumSq = weights.reduce((a, b) => a + b * b, 0);
  return (sum * sum) / sumSq;
};

export { getWeight, getPercentile, getMean, getStd, effectiveSampleSize };
