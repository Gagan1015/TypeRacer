import mongoose, { InferSchemaType, Model } from "mongoose";
import { raceModes } from "@typeracrer/shared";

const leaderboardEntrySchema = new mongoose.Schema(
  {
    scope: { type: String, enum: ["global", "seasonal"], required: true, index: true },
    seasonId: { type: String, default: null, index: true },
    mode: { type: String, enum: raceModes, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    username: { type: String, required: true },
    attemptsCount: { type: Number, required: true },
    bestWpm: { type: Number, required: true },
    bestAccuracy: { type: Number, required: true },
    averageWpm: { type: Number, required: true },
    lastAttemptAt: { type: Date, required: true }
  },
  { timestamps: true }
);

leaderboardEntrySchema.index({ scope: 1, seasonId: 1, mode: 1, userId: 1 }, { unique: true });
leaderboardEntrySchema.index({
  scope: 1,
  seasonId: 1,
  mode: 1,
  bestWpm: -1,
  bestAccuracy: -1,
  averageWpm: -1,
  attemptsCount: -1,
  lastAttemptAt: 1,
  userId: 1
});

export type LeaderboardEntryDocument = InferSchemaType<typeof leaderboardEntrySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const LeaderboardEntryModel: Model<LeaderboardEntryDocument> =
  (mongoose.models.LeaderboardEntry as Model<LeaderboardEntryDocument>) ||
  mongoose.model<LeaderboardEntryDocument>("LeaderboardEntry", leaderboardEntrySchema);
