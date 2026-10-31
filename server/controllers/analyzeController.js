import { getUserInfo, getUserSubmissions, CfError } from "../services/cfService.js";
import { computeMetrics } from "../../shared/metrics.js";
import { getPeerBand } from "../../shared/bands.js";
import analytics from "../../shared/analyticsConfig.js";
import {
  getRecommendations,
  BaselineUnavailableError,
} from "../services/recommendationEngine.js";
import { generateCoachingReport } from "../services/llmService.js";
import { sendError } from "../http.js";

const HANDLE_RE = /^[\w.-]{1,24}$/;

const fail = sendError;

export const analyzeUser = async (req, res) => {
  const handle = typeof req.body?.handle === "string" ? req.body.handle.trim() : "";
  if (!HANDLE_RE.test(handle)) {
    return fail(res, 400, "INVALID_HANDLE", "Please enter a valid Codeforces handle.");
  }

  try {
    const userInfo = await getUserInfo(handle);
    if (!userInfo.rating) {
      return fail(
        res,
        400,
        "UNRATED_USER",
        "This user is unrated. CodeCoach requires a rated Codeforces profile to generate recommendations.",
      );
    }

    const submissions = await getUserSubmissions(handle);
    const { topics, totalProblems, solvedSet } = computeMetrics(submissions, userInfo.rating);
    if (totalProblems < analytics.minTotalProblems) {
      return fail(
        res,
        422,
        "INSUFFICIENT_HISTORY",
        `Not enough history: found ${totalProblems} rated problems in your last 500 submissions, need at least ${analytics.minTotalProblems}.`,
      );
    }

    const base = { handle: userInfo.handle, rating: userInfo.rating, rank: userInfo.rank, historyProblems: totalProblems };

    // Nobody is rated above the top band, so there is nothing to compare against.
    if (!getPeerBand(userInfo.rating)) {
      const empty = { weakTopics: [], strongTopics: [], insufficientData: [], baseline: null };
      return res.json({ ...base, recommendations: empty, coachingReport: null, coachingReportSource: "none" });
    }

    const recommendations = await getRecommendations(topics, userInfo.rating, solvedSet);

    // never throws; falls back to deterministic text if no model output passes validation
    const report = await generateCoachingReport(userInfo.rating, recommendations);

    res.json({
      ...base,
      recommendations,
      coachingReport: report.text,
      coachingReportSource: report.source,
    });
  } catch (err) {
    if (err instanceof CfError && err.kind === "not_found") {
      return fail(res, 404, "HANDLE_NOT_FOUND", "Codeforces handle not found. Please check the handle and try again.");
    }
    if (err instanceof CfError) {
      return fail(res, 502, "CODEFORCES_UNAVAILABLE", "Codeforces is not responding right now. Please try again in a minute.");
    }
    if (err instanceof BaselineUnavailableError) {
      console.error("Baseline unavailable:", err.message);
      return fail(res, 503, "BASELINE_UNAVAILABLE", "Peer data is being refreshed. Please try again later.");
    }
    console.error("analyze failed:", err); // details stay in the server log
    fail(res, 500, "INTERNAL", "Something went wrong. Please try again.");
  }
};
