import mongoose from "mongoose";

const storeProductSchema = new mongoose.Schema(
  {
    productCode: { type: String, required: true, unique: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "StoreCategory", required: true, index: true },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: "StoreBrand", required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true, index: true },
    description: { type: String, default: "" },
    pricePaise: { type: Number, required: true, min: 0 },
    mrpPaise: { type: Number, default: null },
    priceIncludesGst: { type: Boolean, default: true },
    hsnCode: { type: String, default: "" },
    gstRateBps: { type: Number, default: 1200 },
    status: {
      type: String,
      enum: ["active", "draft", "archived"],
      default: "draft",
      index: true,
    },
    searchText: { type: String, default: "", index: "text" },
  },
  { timestamps: true, collection: "store_products" }
);

export const StoreProduct =
  mongoose.models.StoreProduct || mongoose.model("StoreProduct", storeProductSchema);
