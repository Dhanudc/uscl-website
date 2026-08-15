import crypto from "crypto";
import Razorpay from "razorpay";

export function getRegistrationFeeInr() {
  const fee = Number(process.env.REGISTRATION_FEE_INR || 999);
  return Number.isFinite(fee) && fee > 0 ? Math.round(fee) : 999;
}

export function getRazorpayConfig() {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
  return { keyId, keySecret, configured: Boolean(keyId && keySecret) };
}

export function getRazorpayClient() {
  const { keyId, keySecret, configured } = getRazorpayConfig();
  if (!configured) {
    throw new Error("Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  const { keySecret } = getRazorpayConfig();
  if (!orderId || !paymentId || !signature || !keySecret) return false;
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}
