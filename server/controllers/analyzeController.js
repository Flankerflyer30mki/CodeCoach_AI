import { getUserInfo, getUserSubmissions } from "../services/cfService.js";
import {computeUserAnalytics} from "../services/analyticsEngine.js";
import { getRecommendations } from "../services/recommendationEngine.js";

export const analyzeUser = async (req, res) => {
    try {
        // step 1 — get the handle from the request body
        const handle = req.body.handle;

        // step 2 — fetch user profile and submissions from CF API
        const userInfo = await getUserInfo(handle);
        const submissions = await getUserSubmissions(handle);

        // step 3 — compute this user's metrics using analyticsEngine
        const userMetrics = computeUserAnalytics(submissions, userInfo.rating);

        // step 4 — compare against peer baseline and get recommendations
        const recommendations = await getRecommendations(userMetrics, userInfo.rating);

        // step 5 — send everything back to React
        res.json({
            handle,
            rating: userInfo.rating,
            rank: userInfo.rank,
            recommendations,
        });

    } catch(error) {
        res.status(500).json({ error: error.message });
    }
}