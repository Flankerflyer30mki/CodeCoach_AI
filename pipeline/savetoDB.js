import mongoose from "mongoose";
import config from "./config.js";

//schema
const PeerBaselineSchema = new mongoose.Schema({
  bandMin: Number,
  bandMax: Number,
  topic: String,
  userCount: Number,
  computedAt: Date,
  metrics: {
    attemptRatio: {
      mean: Number,
      std: Number,
    },
    solveRate: {
      mean: Number,
      std: Number,
    },
    coverage: {
      p10: { mean: Number, std: Number },
      p50: { mean: Number, std: Number },
      p90: { mean: Number, std: Number },
    },
    dcr: {
      bucket0_100: {
        mean: Number,
        std: Number,
      },
      bucket100_300: {
        mean: Number,
        std: Number,
      },
      bucket300plus: {
        mean: Number,
        std: Number,
      },
    },
  },
});

//model
const PeerBaseline = mongoose.model("PeerBaselineData", PeerBaselineSchema);

//async fn to connect db
const connectDb = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:");
    console.error(error.message);
    process.exit(1);
  }
};

//saveBaseline

const saveBaseline = async (data) => {
  try {
    const doc = new PeerBaseline(data);
    await doc.save();
    console.log("Data saved");
  } catch (err) {
    console.error("Failed to save");
    console.error(err.message);
    process.exit(1);
  }
};

export { connectDb, saveBaseline };
