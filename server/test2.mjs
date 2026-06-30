import mongoose from "mongoose";
import dotenv from "dotenv";
import PeerBaseline from "./models/peerBaseline.js";
dotenv.config();

import { getUserInfo, getUserSubmissions } from "./services/cfService.js";
import { computeUserAnalytics } from "./services/analyticsEngine.js";
import { getRecommendations } from "./services/recommendationEngine.js";

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const peerBaseline = await PeerBaseline.find({
    bandMin: 1500,
    bandMax: 1600,
  });
  for (const doc of peerBaseline) {
    console.log(
      `${doc.topic}: coverage p90 std = ${doc.metrics.coverage.p90.std}`,
    );
  }
  console.log("MongoDB connected");

  const handle = "siddharth1119sid";
  const userInfo = await getUserInfo(handle);
  const submissions = await getUserSubmissions(handle);

  console.log(`User: ${handle}, Rating: ${userInfo.rating}`);

  const userMetrics = computeUserAnalytics(submissions, userInfo.rating);
  const recommendations = await getRecommendations(
    userMetrics,
    userInfo.rating,
  );

  console.log(JSON.stringify(recommendations, null, 2));

  mongoose.connection.close();
};

main();
