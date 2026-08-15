import { PlayerRegistration } from "../models/PlayerRegistration.js";

/**
 * Backfill top-level paymentStatus from nested payment.status for older rows.
 */
export async function backfillPaymentStatusColumn() {
  const docs = await PlayerRegistration.find({
    $or: [{ paymentStatus: { $exists: false } }, { paymentStatus: null }, { paymentStatus: "" }],
  }).select("_id paymentStatus payment.status");

  let updated = 0;
  for (const doc of docs) {
    const nested = String(doc.payment?.status || "pending").toLowerCase();
    const next =
      nested === "paid" ? "paid" : nested === "failed" ? "failed" : nested === "cancelled" ? "cancelled" : "pending";
    doc.paymentStatus = next;
    await doc.save();
    updated += 1;
  }

  if (updated > 0) {
    console.log(`[server] Backfilled paymentStatus on ${updated} registration(s)`);
  }
}
