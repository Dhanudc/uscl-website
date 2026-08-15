/** Normalize registration payment status from the dedicated DB column. */
export function getPaymentStatus(reg) {
  if (!reg) return "pending";
  const top = String(reg.paymentStatus || "").trim().toLowerCase();
  if (top) return top;
  const nested = String(reg.payment?.status || "").trim().toLowerCase();
  return nested || "pending";
}

export function paymentStatusLabel(status) {
  const s = String(status || "pending").toLowerCase();
  if (s === "paid") return "PAID";
  if (s === "failed") return "FAILED";
  if (s === "cancelled") return "CANCELLED";
  return "PENDING";
}
