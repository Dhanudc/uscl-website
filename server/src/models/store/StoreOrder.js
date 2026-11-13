import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "StoreProduct" },
    sizeId: { type: mongoose.Schema.Types.ObjectId, ref: "StoreProductSize" },
    productCode: String,
    sizeCode: String,
    sizeLabel: String,
    name: String,
    imageCard: String,
    unitPricePaise: Number,
    quantity: Number,
    hsnCode: String,
    gstRateBps: Number,
    taxablePaise: Number,
    cgstPaise: Number,
    sgstPaise: Number,
    igstPaise: Number,
    lineTotalPaise: Number,
  },
  { _id: false }
);

const storeOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "StoreCustomer", required: true, index: true },
    addressSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    items: [orderItemSchema],
    subtotalPaise: { type: Number, default: 0 },
    discountPaise: { type: Number, default: 0 },
    deliveryFeePaise: { type: Number, default: 0 },
    cgstPaise: { type: Number, default: 0 },
    sgstPaise: { type: Number, default: 0 },
    igstPaise: { type: Number, default: 0 },
    totalPaise: { type: Number, default: 0 },
    couponCode: { type: String, default: "" },
    billType: { type: String, enum: ["gst", "normal"], default: "gst" },
    customerGstin: { type: String, default: "" },
    customerBusinessName: { type: String, default: "" },
    paymentMode: { type: String, enum: ["cashfree", "cod", "dummy"], default: "cashfree" },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    orderStatus: {
      type: String,
      enum: [
        "pending_payment",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refund_pending",
        "refunded",
      ],
      default: "pending_payment",
      index: true,
    },
    invoiceNumber: { type: String, default: "" },
    cashfreeOrderId: { type: String, default: "", index: true },
    idempotencyKey: { type: String, default: "", index: true },
    statusHistory: [
      {
        status: String,
        at: { type: Date, default: Date.now },
        note: String,
      },
    ],
  },
  { timestamps: true, collection: "store_orders" }
);

export const StoreOrder =
  mongoose.models.StoreOrder || mongoose.model("StoreOrder", storeOrderSchema);
