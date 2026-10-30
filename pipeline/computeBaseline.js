import { getMean, getStd } from "../shared/mathUtils.js";

const stat = (values) => ({
  mean: getMean(values),
  std: getStd(values),
  n: values.length,
});

const BUCKETS = ["bucket0_100", "bucket100_300", "bucket300plus"];

// peerProfiles: one `topics` object (from computeMetrics) per peer.
// Every peer here already passed the history-size gate, so a peer with no entry
// for a topic really did skip it -> counts as attemptRatio 0 (a true zero).
// Every other metric is undefined for such a peer, so it is left out (not zero-filled).
export const computeBaseline = (peerProfiles) => {
  const allTopics = new Set(peerProfiles.flatMap((p) => Object.keys(p)));
  const baseline = {};

  for (const topic of allTopics) {
    const attempters = peerProfiles.map((p) => p[topic]).filter(Boolean);
    const dcr = {};
    for (const b of BUCKETS) {
      dcr[b] = stat(attempters.map((t) => t.dcr[b]).filter((v) => v !== null));
    }
    baseline[topic] = {
      attempters: attempters.length,
      attemptRatio: stat(peerProfiles.map((p) => p[topic]?.attemptRatio ?? 0)),
      solveRate: stat(attempters.map((t) => t.solveRate)),
      coverage: {
        p10: stat(attempters.map((t) => t.coverage.p10)),
        p50: stat(attempters.map((t) => t.coverage.p50)),
        p90: stat(attempters.map((t) => t.coverage.p90)),
      },
      dcr,
    };
  }
  return baseline;
};
