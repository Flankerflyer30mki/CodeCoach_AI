import { getWeight, getPercentile } from "../../shared/mathUtils.js";
import { getDcrBucket } from "../../shared/dcrUtils.js";

const computeUserAnalytics = (submissions, userRating) => {
  const topicData = {};
  let totalWeightedAttempts = 0;

  for (let j = 0; j < submissions.length; j++) {
    const submission = submissions[j];
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
          rawAttempts: 0,
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
      topicData[tag].rawAttempts += 1;
      if (solved) {
        topicData[tag].weightedSolved += weight;
      }
      topicData[tag].ratings.push(rating);

      const diffGap = rating - userRating;
      const bucket = getDcrBucket(diffGap);
      if (bucket) {
        topicData[tag].dcr[bucket].attempted += weight;
        if (solved) {
          topicData[tag].dcr[bucket].solved += weight;
        }
      }
    }
  }

  // now compute final per-topic metrics for this single user
  const userMetrics = {};
  for (const tag in topicData) {
    const attemptRatio =
      topicData[tag].weightedAttempts / totalWeightedAttempts;
    const solveRate =
      topicData[tag].weightedSolved / topicData[tag].weightedAttempts;

    userMetrics[tag] = {
      attemptRatio,
      solveRate,
      attemptCount: topicData[tag].weightedAttempts,
      rawAttemptCount: topicData[tag].rawAttempts,
      coverage: {
        p10: getPercentile(topicData[tag].ratings, 10),
        p50: getPercentile(topicData[tag].ratings, 50),
        p90: getPercentile(topicData[tag].ratings, 90),
      },
      dcr: {
        bucket0_100:
          topicData[tag].dcr.bucket0_100.attempted > 0
            ? topicData[tag].dcr.bucket0_100.solved /
              topicData[tag].dcr.bucket0_100.attempted
            : 0,
        bucket100_300:
          topicData[tag].dcr.bucket100_300.attempted > 0
            ? topicData[tag].dcr.bucket100_300.solved /
              topicData[tag].dcr.bucket100_300.attempted
            : 0,
        bucket300plus:
          topicData[tag].dcr.bucket300plus.attempted > 0
            ? topicData[tag].dcr.bucket300plus.solved /
              topicData[tag].dcr.bucket300plus.attempted
            : 0,
      },
    };
  }

  return userMetrics;
};

export { computeUserAnalytics };
