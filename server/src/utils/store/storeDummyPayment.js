import { getCashfreeConfig } from "../cashfree.js";

/** Allow simulated store checkout when Cashfree keys are missing (local dev only). */
export function allowStoreDummyPayment() {
  if (String(process.env.STORE_DUMMY_PAYMENTS || "").toLowerCase() === "false") return false;
  if (String(process.env.STORE_DUMMY_PAYMENTS || "").toLowerCase() === "true") return true;
  return process.env.NODE_ENV !== "production";
}

export function storeDummyPaymentAvailable() {
  return allowStoreDummyPayment() && !getCashfreeConfig().configured;
}

export function shouldUseStoreDummyPayment(requestedMode) {
  const mode = String(requestedMode || "cashfree").toLowerCase();
  if (mode === "dummy") return allowStoreDummyPayment();
  if (mode === "cashfree" && !getCashfreeConfig().configured) return allowStoreDummyPayment();
  return false;
}
