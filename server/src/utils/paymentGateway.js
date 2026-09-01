import { getSiteSettings } from "../models/SiteSettings.js";
import { createCashfreeOrder, getCashfreeConfig, verifyCashfreePayment } from "./cashfree.js";
import { getRazorpayClient, getRazorpayConfig, verifyRazorpaySignature } from "./razorpay.js";

export const PAYMENT_GATEWAYS = ["razorpay", "cashfree"];

export async function getActivePaymentGateway() {
  const settings = await getSiteSettings();
  const gateway = String(settings.paymentGateway || "razorpay").toLowerCase();
  return PAYMENT_GATEWAYS.includes(gateway) ? gateway : "razorpay";
}

export function getGatewayStatus() {
  const razorpay = getRazorpayConfig();
  const cashfree = getCashfreeConfig();
  return {
    razorpay: { configured: razorpay.configured },
    cashfree: { configured: cashfree.configured, mode: cashfree.mode },
  };
}

export function getGatewayPublicConfig(gateway) {
  if (gateway === "cashfree") {
    const { appId, configured, mode } = getCashfreeConfig();
    return { provider: "cashfree", keyId: configured ? appId : "", configured, mode };
  }
  const { keyId, configured } = getRazorpayConfig();
  return { provider: "razorpay", keyId: configured ? keyId : "", configured };
}

export async function createGatewayOrder(gateway, { feeInr, receipt, notes, customer }) {
  if (gateway === "cashfree") {
    const order = await createCashfreeOrder({
      orderId: receipt,
      amountInr: feeInr,
      customer,
    });
    const { appId, mode } = getCashfreeConfig();
    return {
      provider: "cashfree",
      orderId: order.orderId,
      paymentSessionId: order.paymentSessionId,
      amount: order.amount,
      currency: order.currency,
      feeInr,
      keyId: appId,
      mode,
    };
  }

  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.create({
    amount: feeInr * 100,
    currency: "INR",
    receipt: receipt.slice(0, 40),
    notes,
  });
  const { keyId } = getRazorpayConfig();
  return {
    provider: "razorpay",
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    feeInr,
    keyId,
  };
}

export async function verifyGatewayPayment(gateway, payload) {
  if (gateway === "cashfree") {
    const orderId = String(payload.orderId || "").trim();
    if (!orderId) return { ok: false };
    const result = await verifyCashfreePayment(orderId);
    if (!result.paid) return { ok: false };
    return {
      ok: true,
      provider: "cashfree",
      orderId: result.orderId,
      paymentId: result.paymentId,
      signature: "",
    };
  }

  const orderId = String(payload.orderId || "").trim();
  const paymentId = String(payload.paymentId || "").trim();
  const signature = String(payload.signature || "").trim();
  if (!orderId || !paymentId || !signature) return { ok: false };
  const ok = verifyRazorpaySignature({ orderId, paymentId, signature });
  if (!ok) return { ok: false };
  return { ok: true, provider: "razorpay", orderId, paymentId, signature };
}
