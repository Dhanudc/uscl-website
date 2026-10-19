import mongoose from "mongoose";

const teamMentorSchema = new mongoose.Schema(
  {
    franchiseId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },
    profileImage: { type: String, default: "" },
    photo: {
      filename: { type: String, default: "" },
      mimetype: { type: String, default: "" },
      size: { type: Number, default: 0 },
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    addedByRegistrationId: { type: mongoose.Schema.Types.ObjectId, ref: "PlayerRegistration", default: null },
  },
  { timestamps: true }
);

export const TeamMentor = mongoose.model("TeamMentor", teamMentorSchema);
