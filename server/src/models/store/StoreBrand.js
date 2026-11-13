import mongoose from "mongoose";

const storeBrandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, unique: true, index: true },
    logoPath: { type: String, default: "" },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: "store_brands" }
);

export const StoreBrand =
  mongoose.models.StoreBrand || mongoose.model("StoreBrand", storeBrandSchema);
