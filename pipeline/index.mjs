import mongoose from "mongoose";
import config from "./config.js";
import analytics from "../shared/analyticsConfig.js";
import { BANDS, getBand } from "../shared/bands.js";
import { getUserSubmissions } from "../shared/cfApi.js";
import { computeMetrics } from "../shared/metrics.js";
import { getMean } from "../shared/mathUtils.js";
import { getRatedUsers } from "./cfClient.js";
import { computeBaseline } from "./computeBaseline.js";
import { makeRng, shuffle } from "./sampling.js";
import { connectDb, saveBand, publishVersion, BaselineMeta } from "./savetoDB.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const main = async () => {
  await connectDb();

  const meta = await BaselineMeta.findById("current");
  if (meta) {
    const days = (Date.now() - meta.computedAt) / (1000 * 60 * 60 * 24);
    if (days < config.refreshDays) {
      console.log(`Baseline is ${Math.floor(days)} days old. Skipping.`);
      return;
    }
  }

  const seed = Date.now() % 2147483647;
  const rng = makeRng(seed);
  const version = new Date().toISOString();
  console.log(`New baseline version ${version} (seed ${seed})`);

  const allUsers = await getRatedUsers();
  console.log(`Active rated users: ${allUsers.length}`);

  for (const band of BANDS) {
    const candidates = shuffle(
      allUsers.filter((u) => getBand(u.rating)?.key === band.key),
      rng,
    ).slice(0, config.usersPerBand * config.candidateMultiplier);

    const profiles = [];
    const ratings = [];
    for (const user of candidates) {
      if (profiles.length >= config.usersPerBand) break;
      try {
        await sleep(config.rateLimitMs);
        const submissions = await getUserSubmissions(user.handle);
        const { topics, totalProblems } = computeMetrics(submissions, user.rating);
        if (totalProblems < analytics.minTotalProblems) continue; // too little history
        profiles.push(topics);
        ratings.push(user.rating);
      } catch (err) {
        console.warn(`Skipping ${user.handle}: ${err.message}`);
      }
    }

    console.log(`Band ${band.key}: ${profiles.length} valid peers of ${candidates.length} candidates`);
    if (profiles.length < analytics.minPeersPerMetric) {
      throw new Error(`Band ${band.key} has too few valid peers (${profiles.length}); aborting, nothing published`);
    }

    const baseline = computeBaseline(profiles);
    await saveBand(
      Object.entries(baseline).map(([topic, metrics]) => ({
        version,
        bandKey: band.key,
        topic,
        userCount: profiles.length,
        sampleMeanRating: getMean(ratings),
        computedAt: new Date(),
        metrics,
      })),
    );
  }

  await publishVersion(version, seed);
  console.log("Pipeline complete, new baseline is live");
};

main()
  .catch((err) => {
    console.error("Pipeline failed, previous baseline (if any) is untouched:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
