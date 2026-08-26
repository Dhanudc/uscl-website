import { getSiteSettings } from "../models/SiteSettings.js";

export const REGISTRATION_INTERESTS = ["captain", "player", "franchise", "sponsor"];

export const REGISTRATION_FEE_LABELS = {
  captain: "Captain",
  player: "Player",
  franchise: "Franchise",
  sponsor: "Sponsor",
};

function envDefaultFee() {
  const fee = Number(process.env.REGISTRATION_FEE_INR || 999);
  return Number.isFinite(fee) && fee > 0 ? Math.round(fee) : 999;
}

export function normalizeRegistrationFee(value, fallback = envDefaultFee()) {
  const fee = Number(value);
  return Number.isFinite(fee) && fee > 0 ? Math.round(fee) : fallback;
}

export function defaultRegistrationFees() {
  const base = envDefaultFee();
  return {
    captain: base,
    player: base,
    franchise: base,
    sponsor: base,
  };
}

export function normalizeRegistrationFees(input) {
  const defaults = defaultRegistrationFees();
  const fees = { ...defaults };
  const source = input?.toObject?.() || input || {};
  for (const key of REGISTRATION_INTERESTS) {
    if (source[key] != null) {
      fees[key] = normalizeRegistrationFee(source[key], defaults[key]);
    }
  }
  return fees;
}

export async function getRegistrationFees() {
  try {
    const settings = await getSiteSettings();
    return normalizeRegistrationFees(settings.registrationFees);
  } catch {
    return defaultRegistrationFees();
  }
}

export async function getRegistrationFeeInr(interest = "player") {
  const fees = await getRegistrationFees();
  const key = REGISTRATION_INTERESTS.includes(interest) ? interest : "player";
  return fees[key];
}
