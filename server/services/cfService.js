import { cfGet } from "../../shared/cfApi.js";

export { getUserInfo, getUserSubmissions, CfError } from "../../shared/cfApi.js";

const TTL_MS = 6 * 60 * 60 * 1000;
let cache = null; // { at, promise }

const fetchCatalogue = async () => {
  const { problems, problemStatistics } = await cfGet("problemset.problems", {});
  const solvedCount = new Map(
    problemStatistics.map((s) => [`${s.contestId}-${s.index}`, s.solvedCount]),
  );
  return problems
    .filter((p) => p.rating)
    .map((p) => {
      const key = `${p.contestId}-${p.index}`;
      return {
        key,
        name: p.name,
        contestId: p.contestId,
        index: p.index,
        rating: p.rating,
        tags: p.tags,
        solvedCount: solvedCount.get(key) ?? 0,
      };
    });
};

// One download shared by every analysis for 6 hours. Concurrent callers share the
// same in-flight promise; a failed fetch is not cached.
export const getProblemCatalogue = () => {
  if (!cache || Date.now() - cache.at > TTL_MS) {
    const promise = fetchCatalogue();
    cache = { at: Date.now(), promise };
    promise.catch(() => {
      cache = null;
    });
  }
  return cache.promise;
};
