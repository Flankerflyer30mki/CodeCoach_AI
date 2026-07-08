import { getUserInfo, getUserSubmissions } from "../services/cfService.js";
import {computeUserAnalytics} from "../services/analyticsEngine.js";
import { getRecommendations } from "../services/recommendationEngine.js";
import { generateCoachingReport } from "../services/llmService.js";

export const analyzeUser = async (req, res) => {
    try {
      // step 1 — get the handle from the request body
      const handle = req.body.handle;

      // step 2 — fetch user profile and submissions from CF API
      const userInfo = await getUserInfo(handle);
      if (!userInfo.rating) {
        return res.status(400).json({
          error:
            "This user is unrated. CodeCoach requires a rated Codeforces profile to generate recommendations.",
        });
      }
      const submissions = await getUserSubmissions(handle);

      // step 3 — compute this user's metrics using analyticsEngine
      const { userMetrics, solvedSet } = computeUserAnalytics(
        submissions,
        userInfo.rating,
      );

      // step 4 — compare against peer baseline and get recommendations
      const recommendations = await getRecommendations(
        userMetrics,
        userInfo.rating,
        solvedSet,
      );

      let coachingReport = null;
      try {
        coachingReport = await generateCoachingReport(
          handle,
          userInfo.rating,
          recommendations,
        );
      } catch (err) {
        coachingReport = null;
      }

      // step 5 — send everything back to React
      res.json({
        handle,
        rating: userInfo.rating,
        rank: userInfo.rank,
        recommendations,
        coachingReport,
      });
    } catch (error) {
      const message =
        error.response?.data?.comment ||
        error.message ||
        "Something went wrong";
      if (message.includes("not found") || error.response?.status === 400) {
        return res
          .status(404)
          .json({
            error:
              "Codeforces handle not found. Please check the handle and try again.",
          });
      }
      res.status(500).json({ error: message });
    }
}