import mongoose, { InferSchemaType, Model } from "mongoose";

const moderationReasonSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      enum: ["IMPOSSIBLE_CADENCE", "PASTE_BURST", "TIMING_ANOMALY"],
      required: true
    },
    severity: { type: String, enum: ["low", "medium", "high"], required: true },
    confidence: { type: Number, required: true },
    message: { type: String, required: true }
  },
  { _id: false }
);

const moderationReportSchema = new mongoose.Schema(
  {
    source: { type: String, enum: ["system", "user", "admin"], required: true, default: "system" },
    status: {
      type: String,
      enum: ["open", "in_review", "resolved_cheat", "resolved_clean", "dismissed"],
      default: "open",
      required: true,
      index: true
    },
    targetType: { type: String, enum: ["typing_attempt", "user", "text"], required: true, index: true },
    targetId: { type: String, required: true, index: true },
    suspectUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    attemptId: { type: mongoose.Schema.Types.ObjectId, ref: "TypingAttempt", default: null, index: true },
    reasons: { type: [moderationReasonSchema], default: [] },
    summary: { type: String, required: true, maxlength: 280 },
    detail: { type: String, default: "", maxlength: 4000 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: "", maxlength: 2000 }
  },
  { timestamps: true }
);

moderationReportSchema.index({ status: 1, createdAt: -1 });
moderationReportSchema.index({ suspectUserId: 1, createdAt: -1 });
moderationReportSchema.index({ attemptId: 1 }, { unique: true, partialFilterExpression: { attemptId: { $type: "objectId" } } });

export type ModerationReportDocument = InferSchemaType<typeof moderationReportSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ModerationReportModel: Model<ModerationReportDocument> =
  (mongoose.models.ModerationReport as Model<ModerationReportDocument>) ||
  mongoose.model<ModerationReportDocument>("ModerationReport", moderationReportSchema);
