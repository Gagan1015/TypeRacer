import mongoose, { InferSchemaType, Model } from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    sid: { type: String, required: true },
    expiresAt: { type: Date, required: true }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, default: null },
    provider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
      required: true
    },
    providerId: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      required: true
    },
    isBanned: { type: Boolean, default: false, required: true, index: true },
    banReason: { type: String, default: null },
    bannedAt: { type: Date, default: null },
    sessions: { type: [sessionSchema], default: [] }
  },
  { timestamps: true }
);

// Compound index for OAuth lookups
userSchema.index({ provider: 1, providerId: 1 }, { unique: true, sparse: true });

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };
export const UserModel: Model<UserDocument> =
  (mongoose.models.User as Model<UserDocument>) || mongoose.model<UserDocument>("User", userSchema);

