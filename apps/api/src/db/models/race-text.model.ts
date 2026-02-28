import mongoose, { InferSchemaType, Model } from "mongoose";
import { characterProfiles } from "@typeracrer/shared";

const raceTextSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true, trim: true, maxlength: 64 },
    content: { type: String, required: true, trim: true, minlength: 40, maxlength: 1200 },
    language: { type: String, required: true, default: "en", trim: true, maxlength: 8 },
    themes: { type: [String], required: false, default: ["general"] },
    characterProfile: { type: String, required: false, enum: characterProfiles, default: "letters" },
    eraTags: { type: [String], required: false, default: undefined },
    isActive: { type: Boolean, required: true, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }
  },
  { timestamps: true }
);

raceTextSchema.index({ isActive: 1, language: 1, createdAt: -1 });

export type RaceTextDocument = InferSchemaType<typeof raceTextSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const RaceTextModel: Model<RaceTextDocument> =
  (mongoose.models.RaceText as Model<RaceTextDocument>) ||
  mongoose.model<RaceTextDocument>("RaceText", raceTextSchema);
