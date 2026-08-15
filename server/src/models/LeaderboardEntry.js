import mongoose from "mongoose";

const leaderboardSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ["batting", "bowling", "mvp"],
      default: "batting",
      index: true,
    },
    playerName: { type: String, required: true },
    teamId: { type: String, default: "" },
    teamName: { type: String, default: "" },
    value: { type: Number, default: 0 },
    matches: { type: Number, default: 0 },
    note: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const LeaderboardEntry =
  mongoose.models.LeaderboardEntry || mongoose.model("LeaderboardEntry", leaderboardSchema);
