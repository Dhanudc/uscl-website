import mongoose from "mongoose";

const storeProductImageSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "StoreProduct", required: true, index: true },
    sortOrder: { type: Number, default: 0 },
    paths: {
      thumb: { type: String, default: "" },
      card: { type: String, default: "" },
      main: { type: String, default: "" },
      large: { type: String, default: "" },
    },
  },
  { timestamps: true, collection: "store_product_images" }
);

export const StoreProductImage =
  mongoose.models.StoreProductImage || mongoose.model("StoreProductImage", storeProductImageSchema);
