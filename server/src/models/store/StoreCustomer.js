import mongoose from "mongoose";

const storeCustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
    passwordHash: { type: String, default: null },
    playerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
  },
  { timestamps: true, collection: "store_customers" }
);

export const StoreCustomer =
  mongoose.models.StoreCustomer || mongoose.model("StoreCustomer", storeCustomerSchema);
