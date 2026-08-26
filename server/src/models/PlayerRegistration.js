import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    originalName: String,
    filename: String,
    mimeType: String,
    size: Number,
    url: String,
  },
  { _id: false }
);

const registrationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    company: { type: String, required: true },
    role: { type: String, required: true, index: true },
    experienceYears: { type: Number, default: 0, min: 0 },
    city: { type: String, default: "" },
    battingStyle: { type: String, default: "" },
    bowlingStyle: { type: String, default: "" },
    interest: {
      type: String,
      enum: ["player", "captain", "franchise", "sponsor"],
      default: "player",
    },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      index: true,
    },
    idProof: { type: fileSchema, default: null },
    companyId: { type: fileSchema, default: null },
    /** Filename only — file lives in server/public/profile-images/ */
    profileImage: { type: String, default: "", index: true },
    photo: { type: fileSchema, default: null },
    /** Optional UTR after Razorpay (not mandatory). Must be unique when provided. */
    utrNumber: { type: String, default: "" },
    /** Optional payment screenshot filename in server/public/payments/ */
    paymentScreenshot: { type: String, default: "" },
    /** Who last added/updated payment details (player or admin name). */
    paymentDetailsAddedBy: { type: String, default: "" },
    /** When payment details (UTR/screenshot) were last added/updated. */
    paymentDetailsAddedAt: { type: Date, default: null },
    /** Top-level payment status from Razorpay outcome. */
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    /** Admin enabled Pay now for this player on their dashboard. */
    payNowEnabled: { type: Boolean, default: false, index: true },
    payNowEnabledBy: { type: String, default: "" },
    payNowEnabledAt: { type: Date, default: null },
    franchiseId: { type: String, default: "" },
    franchiseName: { type: String, default: "" },
    sponsorPackageId: { type: String, default: "", index: true },
    sponsorPackageTitle: { type: String, default: "" },
    basePrice: { type: Number, default: 0 },
    soldPrice: { type: Number, default: 0 },
    auctionStatus: {
      type: String,
      enum: ["not_listed", "unsold", "sold"],
      default: "not_listed",
      index: true,
    },
    agreedToTerms: { type: Boolean, required: true },
    payment: {
      provider: { type: String, default: "razorpay" },
      status: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending",
      },
      amountInr: { type: Number, default: 0 },
      currency: { type: String, default: "INR" },
      orderId: { type: String, default: "" },
      paymentId: { type: String, default: "" },
      signature: { type: String, default: "" },
      paidAt: { type: Date, default: null },
    },
    adminNotes: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Unique among non-empty UTRs (empty/optional UTRs allowed for multiple players)
registrationSchema.index(
  { utrNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { utrNumber: { $type: "string", $gt: "" } },
  }
);

export const PlayerRegistration =
  mongoose.models.PlayerRegistration ||
  mongoose.model("PlayerRegistration", registrationSchema);
