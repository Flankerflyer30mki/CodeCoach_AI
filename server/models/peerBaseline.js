import mongoose from "mongoose";

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

const PeerBaseline = mongoose.model("PeerBaselineData", PeerBaselineSchema);

export default PeerBaseline;