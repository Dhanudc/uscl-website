import { Schema, models, model, Types } from "mongoose";

export type PlayerRegistrationDocument = {
  _id: string;
  userId: Types.ObjectId;
  fullName: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  experienceYears: number;
  city?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  interest: "player" | "franchise" | "sponsor";
  status: "pending" | "verified" | "rejected";
  agreedToTerms: boolean;
  adminNotes?: string;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const PlayerRegistrationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    company: { type: String, required: true },
    role: { type: String, required: true },
    experienceYears: { type: Number, required: true, min: 0 },
    city: { type: String },
    battingStyle: { type: String },
    bowlingStyle: { type: String },
    interest: {
      type: String,
      enum: ["player", "franchise", "sponsor"],
      default: "player",
    },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      index: true,
    },
    agreedToTerms: { type: Boolean, required: true },
    adminNotes: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const PlayerRegistration =
  models.PlayerRegistration || model("PlayerRegistration", PlayerRegistrationSchema);
