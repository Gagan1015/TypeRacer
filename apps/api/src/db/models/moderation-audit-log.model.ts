import mongoose, { InferSchemaType, Model } from "mongoose";

const moderationAuditLogSchema = new mongoose.Schema(
  {
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, enum: ["report", "user", "text"], required: true, index: true },
    entityId: { type: String, required: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

moderationAuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export type ModerationAuditLogDocument = InferSchemaType<typeof moderationAuditLogSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ModerationAuditLogModel: Model<ModerationAuditLogDocument> =
  (mongoose.models.ModerationAuditLog as Model<ModerationAuditLogDocument>) ||
  mongoose.model<ModerationAuditLogDocument>("ModerationAuditLog", moderationAuditLogSchema);
