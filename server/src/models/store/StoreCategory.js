import mongoose from "mongoose";

const storeCategorySchema = new mongoose.Schema(
  {
    teamId: { type: String, default: null, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true, index: true },
    displayOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
    isGeneral: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "store_categories" }
);

export const StoreCategory =
  mongoose.models.StoreCategory || mongoose.model("StoreCategory", storeCategorySchema);
