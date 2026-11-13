import { Router } from "express";
import crypto from "crypto";
import { StoreCustomer } from "../../models/store/StoreCustomer.js";
import { StoreAddress } from "../../models/store/StoreAddress.js";
import { StoreProduct } from "../../models/store/StoreProduct.js";
import { StoreProductSize } from "../../models/store/StoreProductSize.js";
import { StoreOrder } from "../../models/store/StoreOrder.js";
import { StoreCoupon } from "../../models/store/StoreCoupon.js";
import { StoreCouponRedemption } from "../../models/store/StoreCoupon.js";
import { getStoreSettings } from "../../models/store/StoreSettings.js";
import {
  authenticateStoreLogin,
  clearStoreCustomerCookie,
  hashPassword,
  loadStoreCustomer,
  setStoreCustomerCookie,
  storeCustomerRequired,
} from "../../middleware/storeAuth.js";
import { computeStoreQuote, inrToPaise } from "../../utils/store/storePricing.js";
import { createCashfreeOrder } from "../../utils/cashfree.js";
import { loadProductBundle } from "../../utils/store/storeCatalog.js";
import { shouldUseStoreDummyPayment, storeDummyPaymentAvailable, allowStoreDummyPayment } from "../../utils/store/storeDummyPayment.js";

const router = Router();

router.post("/auth/signup", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const mobile = String(req.body.mobile || "").trim();
    const password = String(req.body.password || "");
    if (!name || !email || !mobile || password.length < 6) {
      return res.status(400).json({ error: "Name, mobile, email and password (6+ chars) are required." });
    }
    const existingUser = await StoreCustomer.findOne({ email });
    if (existingUser) return res.status(409).json({ error: "An account with this email already exists." });
    const passwordHash = await hashPassword(password);
    const customer = await StoreCustomer.create({ name, email, mobile, passwordHash });
    setStoreCustomerCookie(res, customer._id);
    res.json({ customer: { id: String(customer._id), name, email, mobile } });
  } catch (err) {
    res.status(500).json({ error: err.message || "Sign up failed." });
  }
});

router.post("/auth/login", async (req, res) => {
  const result = await authenticateStoreLogin(req.body);
  if (result.error) return res.status(401).json({ error: result.error });
  setStoreCustomerCookie(res, result.customer._id);
  res.json({
    customer: {
      id: String(result.customer._id),
      name: result.customer.name,
      email: result.customer.email,
      mobile: result.customer.mobile,
      linkedPlayer: result.linkedPlayer,
    },
  });
});

router.post("/auth/logout", (_req, res) => {
  clearStoreCustomerCookie(res);
  res.json({ ok: true });
});

router.get("/me", storeCustomerRequired, loadStoreCustomer, (req, res) => {
  res.json({
    customer: {
      id: String(req.storeCustomer._id),
      name: req.storeCustomer.name,
      email: req.storeCustomer.email,
      mobile: req.storeCustomer.mobile,
    },
  });
});

router.get("/addresses", storeCustomerRequired, loadStoreCustomer, async (req, res) => {
  const rows = await StoreAddress.find({ customerId: req.storeCustomer._id }).sort({ isDefault: -1, updatedAt: -1 });
  res.json({ addresses: rows });
});

router.post("/addresses", storeCustomerRequired, loadStoreCustomer, async (req, res) => {
  const body = req.body || {};
  const count = await StoreAddress.countDocuments({ customerId: req.storeCustomer._id });
  const isDefault = count === 0 ? true : Boolean(body.isDefault);
  if (isDefault) {
    await StoreAddress.updateMany({ customerId: req.storeCustomer._id }, { $set: { isDefault: false } });
  }
  const row = await StoreAddress.create({
    customerId: req.storeCustomer._id,
    recipientName: String(body.recipientName || req.storeCustomer.name).trim(),
    mobile: String(body.mobile || req.storeCustomer.mobile).trim(),
    line1: String(body.line1 || "").trim(),
    line2: String(body.line2 || "").trim(),
    landmark: String(body.landmark || "").trim(),
    city: String(body.city || "").trim(),
    state: String(body.state || "").trim(),
    postalCode: String(body.postalCode || "").trim(),
    country: String(body.country || "India").trim(),
    isDefault,
  });
  if (!row.line1 || !row.city || !row.state || !row.postalCode) {
    await row.deleteOne();
    return res.status(400).json({ error: "Complete address is required." });
  }
  res.json({ address: row });
});

router.patch("/addresses/:id/default", storeCustomerRequired, loadStoreCustomer, async (req, res) => {
  const row = await StoreAddress.findOne({ _id: req.params.id, customerId: req.storeCustomer._id });
  if (!row) return res.status(404).json({ error: "Address not found." });
  await StoreAddress.updateMany({ customerId: req.storeCustomer._id }, { $set: { isDefault: false } });
  row.isDefault = true;
  await row.save();
  res.json({ address: row });
});

async function resolveCartLines(items) {
  const lines = [];
  for (const item of items || []) {
    const sizeId = String(item.sizeId || "").trim();
    const qty = Math.max(1, Number(item.quantity) || 1);
    const size = await StoreProductSize.findById(sizeId);
    if (!size || !size.active) throw new Error("Invalid size selection.");
    const bundle = await loadProductBundle(size.productId);
    if (!bundle || bundle.product.status !== "active") throw new Error("Product unavailable.");
    if (size.stockQty < qty) throw new Error(`Only ${size.stockQty} left for size ${size.sizeLabel}.`);
    const cover = bundle.images[0]?.paths?.card || "";
    lines.push({
      productId: bundle.product._id,
      sizeId: size._id,
      productCode: bundle.product.productCode,
      sizeCode: size.sizeCode,
      sizeLabel: size.sizeLabel,
      name: bundle.product.name,
      imageCard: cover,
      unitPricePaise: bundle.product.pricePaise,
      quantity: qty,
      hsnCode: bundle.product.hsnCode,
      gstRateBps: bundle.product.gstRateBps,
    });
  }
  if (!lines.length) throw new Error("Cart is empty.");
  return lines;
}

router.post("/checkout/quote", storeCustomerRequired, loadStoreCustomer, async (req, res) => {
  try {
    const settings = await getStoreSettings();
    const lines = await resolveCartLines(req.body.items);
    const address = req.body.addressId
      ? await StoreAddress.findOne({ _id: req.body.addressId, customerId: req.storeCustomer._id })
      : null;
    const deliveryState = address?.state || String(req.body.deliveryState || settings.gstRegisteredState);
    let coupon = null;
    const code = String(req.body.couponCode || "").trim().toUpperCase();
    if (code) {
      coupon = await StoreCoupon.findOne({ code, active: true });
    }
    const quote = computeStoreQuote({
      lines,
      settings,
      coupon,
      deliveryState,
      billType: settings.billType,
    });
    res.json({ quote });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not quote checkout." });
  }
});

async function finalizeDummyPayment(order, coupon) {
  order.paymentMode = "dummy";
  order.paymentStatus = "paid";
  order.orderStatus = "confirmed";
  order.statusHistory.push({
    status: "confirmed",
    note: "Test payment (development)",
  });
  await order.save();
  if (coupon) {
    await StoreCouponRedemption.updateOne({ orderId: order._id }, { status: "redeemed" });
  }
}

router.post("/checkout/pay", storeCustomerRequired, loadStoreCustomer, async (req, res) => {
  try {
    const settings = await getStoreSettings();
    const idempotencyKey = String(req.body.idempotencyKey || crypto.randomUUID());
    const existing = await StoreOrder.findOne({ idempotencyKey, customerId: req.storeCustomer._id });
    if (existing) {
      return res.json({ order: existing, reused: true });
    }

    const address = await StoreAddress.findOne({
      _id: req.body.addressId,
      customerId: req.storeCustomer._id,
    });
    if (!address) return res.status(400).json({ error: "Choose a delivery address." });

    const lines = await resolveCartLines(req.body.items);
    const clientTotal = Number(req.body.totalPaise);
    let coupon = null;
    const code = String(req.body.couponCode || "").trim().toUpperCase();
    if (code) {
      coupon = await StoreCoupon.findOne({ code, active: true });
      if (!coupon) return res.status(400).json({ error: "Invalid or expired coupon code." });
      const redeemed = await StoreCouponRedemption.findOne({
        couponId: coupon._id,
        customerId: req.storeCustomer._id,
        status: { $in: ["redeemed", "reserved"] },
      });
      if (redeemed) return res.status(400).json({ error: "Coupon already used." });
    }

    const quote = computeStoreQuote({
      lines,
      settings,
      coupon,
      deliveryState: address.state,
      billType: settings.billType,
    });

    if (clientTotal && clientTotal !== quote.totalPaise) {
      return res.status(409).json({
        error: "Total changed. Please review and confirm.",
        quote,
      });
    }

    const paymentMode = String(req.body.paymentMode || "cashfree");
    const useDummy = shouldUseStoreDummyPayment(paymentMode);
    const effectiveMode = useDummy ? "dummy" : paymentMode;

    if (effectiveMode === "cod" && !settings.paymentModes?.cod) {
      return res.status(400).json({ error: "Cash on delivery is not available." });
    }
    if (effectiveMode === "cashfree" && !settings.paymentModes?.cashfree) {
      return res.status(400).json({ error: "Online payment is not available." });
    }

    const orderNumber = `ST-${Date.now()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const order = await StoreOrder.create({
      orderNumber,
      customerId: req.storeCustomer._id,
      addressSnapshot: address.toObject(),
      items: quote.lines.map((l) => ({
        productId: l.productId,
        sizeId: l.sizeId,
        productCode: l.productCode,
        sizeCode: l.sizeCode,
        sizeLabel: l.sizeLabel,
        name: l.name,
        imageCard: l.imageCard,
        unitPricePaise: l.unitPricePaise,
        quantity: l.quantity,
        hsnCode: l.hsnCode,
        gstRateBps: l.gstRateBps,
        taxablePaise: l.taxablePaise || l.lineSubtotalPaise,
        cgstPaise: l.cgstPaise || 0,
        sgstPaise: l.sgstPaise || 0,
        igstPaise: l.igstPaise || 0,
        lineTotalPaise: (l.lineSubtotalPaise || 0) + (l.cgstPaise || 0) + (l.sgstPaise || 0) + (l.igstPaise || 0),
      })),
      subtotalPaise: quote.subtotalPaise,
      discountPaise: quote.discountPaise,
      deliveryFeePaise: quote.deliveryFeePaise,
      cgstPaise: quote.cgstPaise,
      sgstPaise: quote.sgstPaise,
      igstPaise: quote.igstPaise,
      totalPaise: quote.totalPaise,
      couponCode: code,
      billType: settings.billType,
      customerGstin: String(req.body.customerGstin || "").trim(),
      paymentMode: effectiveMode,
      paymentStatus: useDummy || effectiveMode === "cod" ? (useDummy ? "paid" : "pending") : "pending",
      orderStatus: useDummy || effectiveMode === "cod" ? "confirmed" : "pending_payment",
      idempotencyKey,
      statusHistory: [
        {
          status: useDummy || effectiveMode === "cod" ? "confirmed" : "pending_payment",
          note: useDummy ? "Test payment (development)" : effectiveMode === "cod" ? "COD order" : "Order created",
        },
      ],
    });

    for (const line of lines) {
      const updated = await StoreProductSize.findOneAndUpdate(
        { _id: line.sizeId, stockQty: { $gte: line.quantity } },
        { $inc: { stockQty: -line.quantity } },
        { new: true }
      );
      if (!updated) {
        await StoreOrder.deleteOne({ _id: order._id });
        return res.status(409).json({ error: "Stock changed. Refresh cart and try again." });
      }
    }

    if (coupon) {
      await StoreCouponRedemption.create({
        couponId: coupon._id,
        customerId: req.storeCustomer._id,
        orderId: order._id,
        status: "reserved",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });
    }

    let cashfree = null;
    let dummyPayment = useDummy;
    if (useDummy) {
      await finalizeDummyPayment(order, coupon);
    } else if (effectiveMode === "cashfree") {
      const cfOrderId = `store_${order._id}`;
      try {
        cashfree = await createCashfreeOrder({
          orderId: cfOrderId,
          amountInr: quote.totalPaise / 100,
          customer: {
            id: req.storeCustomer._id,
            email: req.storeCustomer.email,
            phone: req.storeCustomer.mobile,
          },
        });
        order.cashfreeOrderId = cfOrderId;
        await order.save();
      } catch (cfErr) {
        if (allowStoreDummyPayment()) {
          dummyPayment = true;
          await finalizeDummyPayment(order, coupon);
        } else {
          await StoreOrder.deleteOne({ _id: order._id });
          for (const line of lines) {
            await StoreProductSize.updateOne({ _id: line.sizeId }, { $inc: { stockQty: line.quantity } });
          }
          if (coupon) await StoreCouponRedemption.deleteOne({ orderId: order._id });
          throw cfErr;
        }
      }
    }

    res.json({ order, cashfree, quote, dummyPayment });
  } catch (err) {
    console.error("store checkout pay", err);
    res.status(400).json({ error: err.message || "Payment could not start." });
  }
});

router.get("/orders", storeCustomerRequired, loadStoreCustomer, async (req, res) => {
  const orders = await StoreOrder.find({ customerId: req.storeCustomer._id }).sort({ createdAt: -1 }).limit(100);
  res.json({ orders });
});

export default router;
