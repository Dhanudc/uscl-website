import mongoose from "mongoose";

const playerActivitySchema = new mongoose.Schema(
  {
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlayerRegistration",
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    action: { type: String, required: true, index: true },
    summary: { type: String, required: true },
    actorName: { type: String, default: "" },
    actorRole: { type: String, enum: ["player", "admin", "system"], default: "player" },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

playerActivitySchema.index({ registrationId: 1, createdAt: -1 });

export const PlayerActivity =
  mongoose.models.PlayerActivity || mongoose.model("PlayerActivity", playerActivitySchema);
