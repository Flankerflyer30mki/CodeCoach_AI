export { getUserInfo, getUserSubmissions } from "../../shared/cfApi.js";

import axios from "axios";

const CF_API_BASE = "https://codeforces.com/api";

export async function getProblemsForTopic(tag, targetRating) {
  const response = await axios.get(`${CF_API_BASE}/problemset.problems`, {
    params: { tags: tag },
  });

  const problems = response.data.result.problems;

  // filter to problems within ±200 of target rating
  const filtered = problems.filter(
    (p) =>
      p.rating &&
      p.rating >= targetRating - 200 &&
      p.rating <= targetRating + 200,
  );

  return filtered;
}
