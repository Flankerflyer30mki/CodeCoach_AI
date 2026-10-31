import mongoose from "mongoose";
import config from "./config.js";
import {
  peerBaselineDefinition,
  baselineMetaDefinition,
} from "../shared/peerBaselineSchema.js";

const PeerBaselineSchema = new mongoose.Schema(peerBaselineDefinition);
PeerBaselineSchema.index({ version: 1, bandKey: 1, topic: 1 }, { unique: true });

export const PeerBaseline = mongoose.model("PeerBaselineData", PeerBaselineSchema);
export const BaselineMeta = mongoose.model(
  "BaselineMeta",
  new mongoose.Schema(baselineMetaDefinition),
);

export const connectDb = async () => {
  await mongoose.connect(config.mongoUri);
  await PeerBaseline.init(); // make sure the unique index exists
};

export const saveBand = (docs) => PeerBaseline.insertMany(docs);

// Called ONLY after every band is written: this is what makes a new baseline live.
export const publishVersion = async (version, seed) => {
  await BaselineMeta.findOneAndUpdate(
    { _id: "current" },
    { version, seed, computedAt: new Date() },
    { upsert: true },
  );
  await PeerBaseline.deleteMany({ version: { $ne: version } }); // drop old versions
};
