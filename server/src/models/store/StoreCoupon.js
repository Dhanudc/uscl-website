import mongoose from "mongoose";

const storeCouponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    name: { type: String, default: "" },
    type: { type: String, enum: ["fixed", "percent"], required: true },
    value: { type: Number, required: true, min: 0 },
    maxDiscountPaise: { type: Number, default: null },
    minOrderPaise: { type: Number, default: 0 },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
    totalLimit: { type: Number, default: null },
    totalUsed: { type: Number, default: 0 },
    eligibleTeamIds: { type: [String], default: [] },
    eligibleProductIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  },
  { timestamps: true, collection: "store_coupons" }
);

export const StoreCoupon =
  mongoose.models.StoreCoupon || mongoose.model("StoreCoupon", storeCouponSchema);

const redemptionSchema = new mongoose.Schema(
  {
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: "StoreCoupon", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "StoreCustomer", required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "StoreOrder", default: null },
    status: { type: String, enum: ["reserved", "redeemed", "released"], default: "reserved" },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "store_coupon_redemptions" }
);

redemptionSchema.index({ couponId: 1, customerId: 1 }, { unique: true });

export const StoreCouponRedemption =
  mongoose.models.StoreCouponRedemption ||
  mongoose.model("StoreCouponRedemption", redemptionSchema);
