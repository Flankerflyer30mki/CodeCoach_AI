import PeerBaseline, { BaselineMeta } from "../models/peerBaseline.js";
import { getPeerBand } from "../../shared/bands.js";
import { scoreTopics } from "./scoring.js";
import { getProblemCatalogue } from "./cfService.js";

export class BaselineUnavailableError extends Error {}

const loadBaseline = async (bandKey) => {
  const meta = await BaselineMeta.findById("current").lean();
  if (!meta) throw new BaselineUnavailableError("No baseline has been published yet");
  const docs = await PeerBaseline.find({ version: meta.version, bandKey }).lean();
  if (docs.length === 0) {
    throw new BaselineUnavailableError(`No baseline for band ${bandKey} in version ${meta.version}`);
  }
  return { docs, version: meta.version, computedAt: meta.computedAt, userCount: docs[0].userCount };
};

// 5 unsolved problems closest to the target rating (ties: more solved = better vetted)
const pickProblems = (catalogue, topic, target, solvedSet, used) =>
  catalogue
    .filter(
      (p) =>
        p.tags.includes(topic) &&
        Math.abs(p.rating - target) <= 200 &&
        !solvedSet.has(p.key) &&
        !used.has(p.key),
    )
    .sort(
      (a, b) =>
        Math.abs(a.rating - target) - Math.abs(b.rating - target) ||
        b.solvedCount - a.solvedCount,
    )
    .slice(0, 5)
    .map((p) => {
      used.add(p.key);
      return {
        name: p.name,
        contestId: p.contestId,
        index: p.index,
        rating: p.rating,
        url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
      };
    });

// Caller must make sure the user has a peer band (see getPeerBand).
export const getRecommendations = async (userTopics, userRating, solvedSet) => {
  const band = getPeerBand(userRating);
  const baseline = await loadBaseline(band.key);
  const result = scoreTopics(userTopics, baseline.docs);

  const catalogue = await getProblemCatalogue();
  const used = new Set();
  for (const topic of result.weakTopics.slice(0, 3)) {
    topic.recommendedProblems = pickProblems(
      catalogue,
      topic.topic,
      topic.recommendedDifficulty,
      solvedSet,
      used,
    );
  }

  return {
    ...result,
    baseline: {
      band: band.key,
      version: baseline.version,
      computedAt: baseline.computedAt,
      peerCount: baseline.userCount,
    },
  };
};
