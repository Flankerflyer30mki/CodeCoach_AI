// "How was this comparison made, and how fresh is the peer data?"
const DAY_MS = 24 * 60 * 60 * 1000;
export const STALE_AFTER_DAYS = 28; // baseline refreshes every 14 days; 2x means a run was missed

export const formatBand = (key) => String(key).replace("-", "–");

export const ageText = (days) => {
  if (days === null) return "at an unknown time";
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
};

// baseline: recommendations.baseline from the API (or null for top-tier users)
export const describeBaseline = (baseline, historyProblems, now = Date.now()) => {
  if (!baseline) return null;
  const time = new Date(baseline.computedAt).getTime();
  const days = Number.isNaN(time) ? null : Math.max(0, Math.floor((now - time) / DAY_MS));
  return {
    band: formatBand(baseline.band),
    peers: baseline.peerCount ?? null,
    ageDays: days,
    age: ageText(days),
    stale: days !== null && days > STALE_AFTER_DAYS,
    historyProblems: historyProblems ?? null,
  };
};
