import mongoose, { InferSchemaType, Model } from "mongoose";

const typingScoreSchema = new mongoose.Schema(
  {
    wpm: { type: Number, required: true },
    rawWpm: { type: Number, required: true },
    accuracy: { type: Number, required: true },
    correctChars: { type: Number, required: true },
    incorrectChars: { type: Number, required: true },
    totalTypedChars: { type: Number, required: true },
    progress: { type: Number, required: true },
    completed: { type: Boolean, required: true },
    durationMs: { type: Number, required: true }
  },
  { _id: false }
);

const typingAttemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    mode: {
      type: String,
      enum: ["timed_15", "timed_30", "timed_60", "timed_120", "timed_custom", "fixed"],
      required: true,
      index: true
    },
    textId: { type: String, required: true },
    prompt: { type: String, required: true },
    typed: { type: String, required: true },
    score: { type: typingScoreSchema, required: true },
    antiCheat: {
      flagged: { type: Boolean, required: true, default: false, index: true },
      reviewStatus: {
        type: String,
        enum: ["pending", "cleared", "confirmed_cheat"],
        required: true,
        default: "cleared",
        index: true
      },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      reviewedAt: { type: Date, default: null },
      reasons: {
        type: [
          new mongoose.Schema(
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
          )
        ],
        default: []
      }
    }
  },
  { timestamps: true }
);

typingAttemptSchema.index({ userId: 1, createdAt: -1 });
typingAttemptSchema.index({ "antiCheat.flagged": 1, createdAt: -1 });

export type TypingAttemptDocument = InferSchemaType<typeof typingAttemptSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const TypingAttemptModel: Model<TypingAttemptDocument> =
  (mongoose.models.TypingAttempt as Model<TypingAttemptDocument>) ||
  mongoose.model<TypingAttemptDocument>("TypingAttempt", typingAttemptSchema);
