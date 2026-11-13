import mongoose from "mongoose";

const storeAddressSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "StoreCustomer", required: true, index: true },
    recipientName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, default: "" },
    landmark: { type: String, default: "" },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, default: "India", trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "store_addresses" }
);

export const StoreAddress =
  mongoose.models.StoreAddress || mongoose.model("StoreAddress", storeAddressSchema);
