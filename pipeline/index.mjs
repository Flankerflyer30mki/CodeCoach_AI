import { connectDb } from "./savetoDB.js";
import { saveBaseline } from "./savetoDB.js";
import { getRatedUsers } from "./cfClient.js";
import { getUserSubmissions } from "../shared/cfApi.js";
import { computeBaseline } from "./computeBaseline.js";
import config from "./config.js";
import mongoose from "mongoose";

const main = async () => {
    await connectDb();
    const lastDoc = await mongoose.connection.db.collection("peerbaselinedatas").findOne({}, { sort: { computedAt: -1 } });
    if (lastDoc){
        const daysSinceLastRun =(Date.now() - new Date(lastDoc.computedAt)) / (1000 * 60 * 60 * 24);
        if (daysSinceLastRun < 14) {
            console.log(`Last run was ${Math.floor(daysSinceLastRun)} days ago. Skipping.`,);
            mongoose.connection.close();
            return;
        }
        else {
            console.log("14 days passed. Clearing old data and recomputing...");
            await mongoose.connection.db.collection("peerbaselinedatas").deleteMany({});
        }
    }
    console.log("Fetching rated users...");
    const allUsers = await getRatedUsers();
    console.log(`Total users fetched:${allUsers.length}`);
    for (const [bandMin, bandMax] of config.ratingBands) {
        console.log(`Processing band ${bandMin}-${bandMax}`);
        const bandUsers = allUsers.filter((u) => u.rating >= bandMin && u.rating < bandMax,);
        console.log(`Users in band:${bandUsers.length}`);
        const sampled = bandUsers.slice(0, config.usersPerBand);
        const usersSubmissions = [];
        const userRatings = [];
        for (const user of sampled) {
          console.log(`Fetching submissions for ${user.handle}`);
          const submissions = await getUserSubmissions(user.handle);
          usersSubmissions.push(submissions);
          userRatings.push(user.rating);
        }
        console.log(`Computing baseline for band ${bandMin}-${bandMax}`);
        const baseline = computeBaseline(usersSubmissions, userRatings);
        for (const topic in baseline) {
          await saveBaseline({
            bandMin,
            bandMax,
            topic,
            userCount: sampled.length,
            computedAt: new Date(),
            metrics: baseline[topic],
          });
        }
        console.log(`Band ${bandMin}-${bandMax} done`);
    }
    console.log("Pipeline complete");
    mongoose.connection.close();
};
main();
