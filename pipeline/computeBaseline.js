import config from "./config.js";

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

const computeBaseline = (usersSubmissions, userRatings) => {
  const allUserstopicData = {};
  for (let i = 0; i < usersSubmissions.length; i++) {
    const userRating = userRatings[i];
    const userSubmissions = usersSubmissions[i];
    const topicData = {};
    let totalWeightedAttempts = 0;
    for (let j = 0; j < userSubmissions.length; j++) {
      const submission = userSubmissions[j];
      const weight = getWeight(submission.creationTimeSeconds);
      const rating = submission.problem.rating;
      const tags = submission.problem.tags;
      const solved = submission.verdict === "OK";
      if (!rating) {
        continue;
      }
      totalWeightedAttempts += weight;
      for (let k = 0; k < tags.length; k++) {
        const tag = tags[k];
        if (!topicData[tag]) {
          topicData[tag] = {
            weightedAttempts: 0,
            weightedSolved: 0,
            ratings: [],
            dcr: {
              bucket0_100: { attempted: 0, solved: 0 },
              bucket100_300: { attempted: 0, solved: 0 },
              bucket300plus: { attempted: 0, solved: 0 },
            },
          };
        }
        topicData[tag].weightedAttempts += weight;
        if (solved) {
          topicData[tag].weightedSolved += weight;
        }
        topicData[tag].ratings.push(rating);
        const diffGap = rating - userRating;
        if (diffGap >= 0 && diffGap <= 100) {
          topicData[tag].dcr.bucket0_100.attempted += weight;
          if (solved) {
            topicData[tag].dcr.bucket0_100.solved += weight;
          }
        } else if (diffGap > 100 && diffGap <= 300) {
          topicData[tag].dcr.bucket100_300.attempted += weight;
          if (solved) {
            topicData[tag].dcr.bucket100_300.solved += weight;
          }
        } else if (diffGap > 300) {
          topicData[tag].dcr.bucket300plus.attempted += weight;
          if (solved) {
            topicData[tag].dcr.bucket300plus.solved += weight;
          }
        }
      }
    }
    for (const tag in topicData) {
      const attemptRatio =
        topicData[tag].weightedAttempts / totalWeightedAttempts;
      const solveRate =
        topicData[tag].weightedSolved / topicData[tag].weightedAttempts;
      const ratings = topicData[tag].ratings;
      if (!allUserstopicData[tag]) {
        allUserstopicData[tag] = [];
      }
      allUserstopicData[tag].push({
        attemptRatio,
        solveRate,
        ratings,
        dcr: topicData[tag].dcr,
      });
    }
  }
  const baseline = {};
  for (const tag in allUserstopicData) {
    const users = allUserstopicData[tag];
    const attemptRatios = users.map((u) => u.attemptRatio);
    const solveRates = users.map((u) => u.solveRate);
    const p10s = users.map((u) => getPercentile(u.ratings, 10));
    const p50s = users.map((u) => getPercentile(u.ratings, 50));
    const p90s = users.map((u) => getPercentile(u.ratings, 90));
    const dcr0_100 = users.map((u) =>
      u.dcr.bucket0_100.attempted > 0
        ? u.dcr.bucket0_100.solved / u.dcr.bucket0_100.attempted
        : 0,
    );
    const dcr100_300 = users.map((u) =>
      u.dcr.bucket100_300.attempted > 0
        ? u.dcr.bucket100_300.solved / u.dcr.bucket100_300.attempted
        : 0,
    );
    const dcr300plus = users.map((u) =>
      u.dcr.bucket300plus.attempted > 0
        ? u.dcr.bucket300plus.solved / u.dcr.bucket300plus.attempted
        : 0,
    );
    baseline[tag] = {
      attemptRatio: {
        mean: getMean(attemptRatios),
        std: getStd(attemptRatios),
      },
      solveRate: {
        mean: getMean(solveRates),
        std: getStd(solveRates),
      },
      coverage: {
        p10: { mean: getMean(p10s), std: getStd(p10s) },
        p50: { mean: getMean(p50s), std: getStd(p50s) },
        p90: { mean: getMean(p90s), std: getStd(p90s) },
      },
      dcr: {
        bucket0_100: { mean: getMean(dcr0_100), std: getStd(dcr0_100) },
        bucket100_300: { mean: getMean(dcr100_300), std: getStd(dcr100_300) },
        bucket300plus: { mean: getMean(dcr300plus), std: getStd(dcr300plus) },
      },
    };
  }
  return baseline;
};

export { computeBaseline };
