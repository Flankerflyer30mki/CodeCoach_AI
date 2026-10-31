import mongoose from "mongoose";
import {
  peerBaselineDefinition,
  baselineMetaDefinition,
} from "../../shared/peerBaselineSchema.js";

const PeerBaselineSchema = new mongoose.Schema(peerBaselineDefinition);
PeerBaselineSchema.index({ version: 1, bandKey: 1, topic: 1 }, { unique: true });

const PeerBaseline = mongoose.model("PeerBaselineData", PeerBaselineSchema);
export const BaselineMeta = mongoose.model(
  "BaselineMeta",
  new mongoose.Schema(baselineMetaDefinition),
);

export default PeerBaseline;
