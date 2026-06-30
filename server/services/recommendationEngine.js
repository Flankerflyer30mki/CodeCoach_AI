import PeerBaseline from "../models/peerBaseline.js";
import { getMean } from "../../shared/mathUtils.js";

const getPeerBaseline = async (userRating) => {
    const userBandMin = Math.floor(userRating / 100) * 100;
  const bandMin = userBandMin + 100;
  const bandMax = userBandMin + 200;
  console.log(`Querying band: ${bandMin}-${bandMax}`);
  const results = await PeerBaseline.find({ bandMin, bandMax });
  console.log(`Documents found: ${results.length}`);
  return results;
};

const computeConfidence = (userTopicMetrics) => {
  const c_size = Math.min(userTopicMetrics.attemptCount / 10, 1.0);
  const c_spread = Math.min(
    (userTopicMetrics.coverage.p90 - userTopicMetrics.coverage.p10) / 600,
    1.0,
  );
  const c_recency =
    userTopicMetrics.attemptCount / userTopicMetrics.rawAttemptCount;
  const confidence = 0.4 * c_size + 0.3 * c_spread + 0.3 * c_recency;
  return confidence;
};

const computeGaps = (userTopicMetrics, peerTopicBaseline) => {
  const attemptGap =
    peerTopicBaseline.metrics.attemptRatio.mean - userTopicMetrics.attemptRatio;
  const successGap =
    peerTopicBaseline.metrics.solveRate.mean - userTopicMetrics.solveRate;
  const coverageGap =
    peerTopicBaseline.metrics.coverage.p90.mean - userTopicMetrics.coverage.p90;
  const dcrGap0_100 =
    peerTopicBaseline.metrics.dcr.bucket0_100.mean -
    userTopicMetrics.dcr.bucket0_100;
  const dcrGap100_300 =
    peerTopicBaseline.metrics.dcr.bucket100_300.mean -
    userTopicMetrics.dcr.bucket100_300;
  const dcrGap300plus =
    peerTopicBaseline.metrics.dcr.bucket300plus.mean -
    userTopicMetrics.dcr.bucket300plus;
  const conversionGap = (dcrGap0_100 + dcrGap100_300 + dcrGap300plus) / 3;
  return {
    attemptGap,
    successGap,
    coverageGap,
    conversionGap,
  };
};

const classify = (gaps, confidence, peerTopicBaseline) => {
  if (confidence < 0.3) {
    if (gaps.attemptGap > 0.02) {
      return "avoided";
    }
    return "insufficient_data";
  } else if (
    gaps.attemptGap >
    1.0 * peerTopicBaseline.metrics.attemptRatio.std
  ) {
    return "avoided";
  } else if (
    gaps.coverageGap > 0.3 * peerTopicBaseline.metrics.coverage.p90.std &&
    gaps.successGap > -0.1
  ) {
    return "underdeveloped";
  } else if (gaps.successGap > 1.0 * peerTopicBaseline.metrics.solveRate.std) {
    return "struggling";
  } else {
    return "strong";
  }
};

const computePriority = (gaps, confidence, peerTopicBaseline) => {
  const importance = peerTopicBaseline.metrics.attemptRatio.mean;
  const total_gap =
    0.25 * gaps.attemptGap +
    0.25 * gaps.successGap +
    0.25 * gaps.coverageGap +
    0.25 * gaps.conversionGap;
  const priority = importance * total_gap * confidence;
  return { importance, total_gap, priority };
};

const getRecommendations = async (userMetrics, userRating) => {
  const peerBaseline = await getPeerBaseline(userRating);
  const baselineByTopic = {};
  for (const doc of peerBaseline) {
    baselineByTopic[doc.topic] = doc;
  }
  const results = [];

  for (const topic in userMetrics) {
    const userTopicMetrics = userMetrics[topic];
    const peerTopicBaseline = baselineByTopic[topic];

    if (!peerTopicBaseline) {
      continue;
    }

    const confidence = computeConfidence(userTopicMetrics);
    const gaps = computeGaps(userTopicMetrics, peerTopicBaseline);
    const classification = classify(gaps, confidence, peerTopicBaseline);
    const { priority } = computePriority(gaps, confidence, peerTopicBaseline);

    results.push({
      topic,
      classification,
      priority,
      confidence,
      gaps,
    });
  }
  results.sort((a, b) => b.priority - a.priority);

  const weakTopics = results.filter(
    (r) =>
      r.classification === "avoided" ||
      r.classification === "underdeveloped" ||
      r.classification === "struggling",
  );
  const strongTopics = results.filter((r) => r.classification === "strong");
  const insufficientData = results.filter(
    (r) => r.classification === "insufficient_data",
  );

  return {
    weakTopics,
    strongTopics,
    insufficientData,
  };
};

export { getRecommendations };