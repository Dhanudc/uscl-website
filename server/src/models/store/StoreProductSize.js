import mongoose from "mongoose";

const storeProductSizeSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "StoreProduct", required: true, index: true },
    sizeLabel: { type: String, required: true, trim: true },
    sizeCode: { type: String, required: true, unique: true, index: true },
    stockQty: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "store_product_sizes" }
);

storeProductSizeSchema.index({ productId: 1, sizeLabel: 1 }, { unique: true });

export const StoreProductSize =
  mongoose.models.StoreProductSize || mongoose.model("StoreProductSize", storeProductSizeSchema);
