import config from "../pipeline/config.js";

const getWeight = (creationTimeSeconds) => {
  const age = (Date.now() - creationTimeSeconds * 1000) / (1000 * 60 * 60 * 24);
  return Math.exp(-(config.lambda * age));
};

const getPercentile = (arr, p) => {
  const sorted = [...arr].sort((a, b) => a - b);
  const id = (arr.length - 1) * (p / 100);
  return sorted[Math.floor(id)];
};

const getMean = (arr) => {
  let summ = 0;
  for (let i = 0; i < arr.length; i++) {
    summ += arr[i];
  }
  return summ / arr.length;
};

const getStd = (arr) => {
  const av = getMean(arr);
  let std = 0;
  for (let i = 0; i < arr.length; i++) {
    std += Math.pow(arr[i] - av, 2);
  }
  return Math.sqrt(std / arr.length);
};

export {getWeight, getPercentile, getMean, getStd};