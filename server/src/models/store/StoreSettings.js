import mongoose from "mongoose";

const DEFAULT_POLICIES = {
  delivery: "",
  returns: "",
  refund: "",
  terms: "",
};

const storeSettingsSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    productCodeSeq: { type: Number, default: 0 },
    deliveryFeePaise: { type: Number, default: 9900 },
    freeDeliveryThresholdPaise: { type: Number, default: 149900 },
    freeDeliveryAfterDiscount: { type: Boolean, default: true },
    paymentModes: {
      cashfree: { type: Boolean, default: true },
      cod: { type: Boolean, default: false },
    },
    gstRegisteredState: { type: String, default: "Telangana" },
    businessLegalName: { type: String, default: "Wesley Elite Sports LLP" },
    gstin: { type: String, default: "" },
    registeredAddress: { type: String, default: "" },
    billType: { type: String, enum: ["gst", "normal"], default: "gst" },
    pricesIncludeGst: { type: Boolean, default: true },
    deliveryFeeTaxable: { type: Boolean, default: true },
    deliveryGstRateBps: { type: Number, default: 1200 },
    invoicePrefix: { type: String, default: "USCL" },
    invoiceSeq: { type: Number, default: 0 },
    invoiceFinancialYear: { type: String, default: "" },
    lowStockThreshold: { type: Number, default: 2 },
    maxImagesPerProduct: { type: Number, default: 8 },
    maxImageBytes: { type: Number, default: 5 * 1024 * 1024 },
    policies: { type: mongoose.Schema.Types.Mixed, default: () => ({ ...DEFAULT_POLICIES }) },
  },
  { timestamps: true, collection: "store_settings" }
);

export const StoreSettings =
  mongoose.models.StoreSettings || mongoose.model("StoreSettings", storeSettingsSchema);

export async function getStoreSettings() {
  let doc = await StoreSettings.findOne();
  if (!doc) {
    doc = await StoreSettings.create({});
  }
  return doc;
}
