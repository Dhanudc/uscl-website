import mongoose from "mongoose";

const lineupEntrySchema = new mongoose.Schema(
  {
    registrationId: { type: mongoose.Schema.Types.ObjectId, ref: "PlayerRegistration", required: true },
    order: { type: Number, required: true, min: 1 },
    squadRole: {
      type: String,
      enum: ["captain", "vice_captain", "player"],
      default: "player",
    },
    playingRole: { type: String, default: "" },
  },
  { _id: false }
);

const teamLineupSchema = new mongoose.Schema(
  {
    franchiseId: { type: String, required: true, unique: true, index: true },
    entries: { type: [lineupEntrySchema], default: [] },
    updatedByRegistrationId: { type: mongoose.Schema.Types.ObjectId, ref: "PlayerRegistration", default: null },
  },
  { timestamps: true }
);

export const TeamLineup = mongoose.model("TeamLineup", teamLineupSchema);
