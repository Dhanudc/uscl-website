import { PlayerRegistration } from "../models/PlayerRegistration.js";
import { getSiteSettings } from "../models/SiteSettings.js";
import { formatPlayerCode } from "./playerCode.js";

export function isReferralProgramEnabled(settings) {
  return settings?.referralProgramEnabled !== false;
}

export function normalizeReferralPlayerCode(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 0) return "";
  return formatPlayerCode(n);
}

export function emptyReferralFields() {
  return {
    referredByPlayerCode: "",
    referredByUserId: null,
    referredByRegistrationId: null,
    referredByName: "",
  };
}

/** Resolve an optional Player ID into stored referral fields (linked to the referrer's userId). */
export async function resolveReferralCode(rawCode, { currentUserId } = {}) {
  const code = normalizeReferralPlayerCode(rawCode);
  if (!code) {
    return { ok: true, referral: emptyReferralFields() };
  }

  const settings = await getSiteSettings();
  if (!isReferralProgramEnabled(settings)) {
    return { ok: true, referral: emptyReferralFields() };
  }

  const referrer = await PlayerRegistration.findOne({ playerCode: code })
    .select("_id userId playerCode fullName")
    .lean();

  if (!referrer) {
    return {
      ok: false,
      error: "Referral Player ID was not found. Check the ID or leave this field blank.",
    };
  }

  if (currentUserId && String(referrer.userId) === String(currentUserId)) {
    return { ok: false, error: "You cannot use your own Player ID as a referral code." };
  }

  return {
    ok: true,
    referral: {
      referredByPlayerCode: String(referrer.playerCode || code),
      referredByUserId: referrer.userId,
      referredByRegistrationId: referrer._id,
      referredByName: String(referrer.fullName || "").trim(),
    },
  };
}

export function mapReferredPlayer(reg) {
  return {
    _id: reg._id,
    playerCode: reg.playerCode || "",
    fullName: reg.fullName,
    email: reg.email,
    phone: reg.phone,
    interest: reg.interest,
    status: reg.status,
    createdAt: reg.createdAt,
    referredByPlayerCode: reg.referredByPlayerCode || "",
    referredByUserId: reg.referredByUserId || null,
    referredByName: reg.referredByName || "",
  };
}
