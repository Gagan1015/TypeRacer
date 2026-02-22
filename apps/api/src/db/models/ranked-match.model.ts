import mongoose, { InferSchemaType, Model } from "mongoose";
import { raceModes } from "@typeracrer/shared";

const rankedDeltaSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
    place: { type: Number, required: true },
    oldRating: { type: Number, required: true },
    newRating: { type: Number, required: true },
    delta: { type: Number, required: true },
    outcome: { type: String, enum: ["win", "loss", "draw"], required: true }
  },
  { _id: false }
);

const rankedMatchSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    mode: { type: String, enum: raceModes, required: true, index: true },
    seasonId: { type: String, required: true, index: true },
    playedAt: { type: Date, required: true, index: true },
    participantCount: { type: Number, required: true },
    globalDeltas: { type: [rankedDeltaSchema], default: [] },
    seasonalDeltas: { type: [rankedDeltaSchema], default: [] }
  },
  { timestamps: true }
);

rankedMatchSchema.index({ "globalDeltas.userId": 1, playedAt: -1 });
rankedMatchSchema.index({ "seasonalDeltas.userId": 1, playedAt: -1 });

export type RankedMatchDocument = InferSchemaType<typeof rankedMatchSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const RankedMatchModel: Model<RankedMatchDocument> =
  (mongoose.models.RankedMatch as Model<RankedMatchDocument>) ||
  mongoose.model<RankedMatchDocument>("RankedMatch", rankedMatchSchema);
