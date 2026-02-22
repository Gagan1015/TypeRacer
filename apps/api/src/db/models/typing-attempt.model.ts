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
      enum: ["timed_30", "timed_60", "fixed"],
      required: true,
      index: true
    },
    textId: { type: String, required: true },
    prompt: { type: String, required: true },
    typed: { type: String, required: true },
    score: { type: typingScoreSchema, required: true }
  },
  { timestamps: true }
);

typingAttemptSchema.index({ userId: 1, createdAt: -1 });

export type TypingAttemptDocument = InferSchemaType<typeof typingAttemptSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const TypingAttemptModel: Model<TypingAttemptDocument> =
  (mongoose.models.TypingAttempt as Model<TypingAttemptDocument>) ||
  mongoose.model<TypingAttemptDocument>("TypingAttempt", typingAttemptSchema);

