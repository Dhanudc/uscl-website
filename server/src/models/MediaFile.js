import mongoose from "mongoose";

const mediaFileSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true, unique: true, index: true },
    mimeType: { type: String, default: "application/octet-stream" },
    size: { type: Number, default: 0 },
    kind: { type: String, enum: ["profile", "payment", "social", "other"], default: "other" },
    data: { type: Buffer, required: true },
  },
  { timestamps: true }
);

export const MediaFile = mongoose.model("MediaFile", mediaFileSchema);
