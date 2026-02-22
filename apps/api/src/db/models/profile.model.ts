import mongoose, { InferSchemaType, Model } from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    displayName: { type: String, required: true, trim: true, maxlength: 32 },
    bio: { type: String, default: "", maxlength: 280 },
    avatarUrl: { type: String, default: "" },
    keyboardLayout: {
      type: String,
      enum: ["qwerty", "dvorak", "colemak"],
      default: "qwerty",
      required: true
    }
  },
  { timestamps: true }
);

export type ProfileDocument = InferSchemaType<typeof profileSchema> & { _id: mongoose.Types.ObjectId };
export const ProfileModel: Model<ProfileDocument> =
  (mongoose.models.Profile as Model<ProfileDocument>) ||
  mongoose.model<ProfileDocument>("Profile", profileSchema);

