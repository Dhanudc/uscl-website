import mongoose from "mongoose";

const matchSchema = new mongoose.Schema(
  {
    matchNumber: { type: Number, default: 0 },
    stage: {
      type: String,
      enum: ["league", "semi", "final", "other"],
      default: "league",
    },
    teamAId: { type: String, required: true },
    teamAName: { type: String, required: true },
    teamBId: { type: String, required: true },
    teamBName: { type: String, required: true },
    scheduledAt: { type: Date, required: true, index: true },
    venue: { type: String, default: "" },
    status: {
      type: String,
      enum: ["upcoming", "live", "completed", "cancelled"],
      default: "upcoming",
      index: true,
    },
    teamAScore: { type: String, default: "" },
    teamBScore: { type: String, default: "" },
    winnerId: { type: String, default: "" },
    winnerName: { type: String, default: "" },
    resultSummary: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Match = mongoose.models.Match || mongoose.model("Match", matchSchema);
