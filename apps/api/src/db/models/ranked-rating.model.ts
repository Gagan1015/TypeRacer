import mongoose, { InferSchemaType, Model } from "mongoose";

const rankedRatingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    username: { type: String, required: true },
    scope: { type: String, enum: ["global", "seasonal"], required: true, index: true },
    seasonId: { type: String, default: null, index: true },
    rating: { type: Number, required: true, default: 1200 },
    gamesPlayed: { type: Number, required: true, default: 0 },
    wins: { type: Number, required: true, default: 0 },
    losses: { type: Number, required: true, default: 0 },
    draws: { type: Number, required: true, default: 0 },
    lastMatchAt: { type: Date, default: null }
  },
  { timestamps: true }
);

rankedRatingSchema.index({ userId: 1, scope: 1, seasonId: 1 }, { unique: true });
rankedRatingSchema.index({
  scope: 1,
  seasonId: 1,
  rating: -1,
  gamesPlayed: -1,
  wins: -1,
  lastMatchAt: 1,
  userId: 1
});

export type RankedRatingDocument = InferSchemaType<typeof rankedRatingSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const RankedRatingModel: Model<RankedRatingDocument> =
  (mongoose.models.RankedRating as Model<RankedRatingDocument>) ||
  mongoose.model<RankedRatingDocument>("RankedRating", rankedRatingSchema);
