import mongoose from "mongoose";
import {
  DEFAULT_MODULE_VISIBILITY,
  normalizeModuleVisibility,
} from "../constants/siteModules.js";
import { profileImagePublicUrl } from "../middleware/upload.js";
import { PlayerRegistration } from "./PlayerRegistration.js";
import { formatPlayerCode } from "../utils/playerCode.js";

const socialSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    href: { type: String, default: "#" },
    iconUrl: { type: String, default: "" },
  },
  { _id: false }
);

const portalMediaItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    sectionId: { type: String, required: true },
    filename: { type: String, required: true },
    title: { type: String, default: "" },
    caption: { type: String, default: "" },
  },
  { _id: false }
);

const sponsorPackageSettingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    priceInr: { type: Number, default: 0 },
    maxSlots: { type: Number, default: 1 },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const moduleVisibilitySchema = new mongoose.Schema(
  {
    about: { type: Boolean, default: true },
    teams: { type: Boolean, default: true },
    sponsors: { type: Boolean, default: true },
    media: { type: Boolean, default: true },
    live: { type: Boolean, default: true },
    wesley: { type: Boolean, default: true },
    franchise: { type: Boolean, default: true },
    register: { type: Boolean, default: true },
    playerJourney: { type: Boolean, default: true },
    referrals: { type: Boolean, default: true },
  },
  { _id: false }
);

const referralWinnerSchema = new mongoose.Schema(
  {
    place: { type: Number, default: 1 },
    playerCode: { type: String, default: "" },
    section: { type: String, enum: ["referral", "giveaway"], default: "referral" },
    name: { type: String, default: "" },
    company: { type: String, default: "" },
    gift: { type: String, default: "" },
  },
  { _id: false }
);

const siteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "default" },
    contact: {
      email: { type: String, default: "info@usclt20.com" },
      phone: { type: String, default: "+91 99999 99999" },
      address: { type: String, default: "Hyderabad, India" },
    },
    socials: {
      type: [socialSchema],
      default: () => [
        { label: "Facebook", href: "#", iconUrl: "" },
        { label: "Instagram", href: "#", iconUrl: "" },
        { label: "LinkedIn", href: "#", iconUrl: "" },
        { label: "YouTube", href: "#", iconUrl: "" },
        { label: "WhatsApp", href: "https://wa.me/917386671777", iconUrl: "" },
      ],
    },
    registrationFees: {
      captain: { type: Number, default: 999 },
      player: { type: Number, default: 999 },
      franchise: { type: Number, default: 999 },
      sponsor: { type: Number, default: 999 },
    },
    portalMedia: {
      images: { type: [portalMediaItemSchema], default: [] },
      videos: { type: [portalMediaItemSchema], default: [] },
    },
    sponsorPackages: {
      type: [sponsorPackageSettingSchema],
      default: () => [],
    },
    /** When false, public Register CTAs are hidden and new registrations are blocked. */
    registrationEnabled: { type: Boolean, default: true },
    /** When false, referral field is hidden and new referral codes are ignored. */
    referralProgramEnabled: { type: Boolean, default: true },
    /** Show/hide public module links (Media, Live, Wesley, etc.). */
    moduleVisibility: {
      type: moduleVisibilitySchema,
      default: () => ({ ...DEFAULT_MODULE_VISIBILITY }),
    },
    /** Active online payment gateway for registrations. */
    paymentGateway: {
      type: String,
      enum: ["razorpay", "cashfree", "qr"],
      default: "razorpay",
    },
    /** Invite URL opened by the floating WhatsApp button. */
    whatsappGroupUrl: { type: String, default: "" },
    /** Public referral-challenge winners announcement. */
    referralChallenge: {
      title: { type: String, default: "Winners Announcement" },
      subtitle: { type: String, default: "Of Referral Challenge" },
      thankYou: {
        type: String,
        default: "To everyone who participated in the referral challenge!",
      },
      supportLine: {
        type: String,
        default: "Your support and enthusiasm made this a huge success.",
      },
      closingLine: {
        type: String,
        default: "Stay tuned for more exciting opportunities!",
      },
      winners: {
        type: [referralWinnerSchema],
        default: () => [],
      },
    },
  },
  { timestamps: true }
);

export const SiteSettings =
  mongoose.models.SiteSettings || mongoose.model("SiteSettings", siteSettingsSchema);

const DEFAULT_WHATSAPP_HREF = "https://wa.me/917386671777";

function isTwitterLabel(label) {
  const key = String(label || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  return key === "twitter" || key === "twitterx" || key === "x";
}

function isWhatsAppHref(href) {
  return /wa\.me|whatsapp\.com|api\.whatsapp/i.test(String(href || ""));
}

export function normalizeSocials(socials, contact) {
  const phoneDigits = String(contact?.phone || "").replace(/\D/g, "");
  const fallbackHref =
    phoneDigits.length >= 10 && !/^91?9{5,}/.test(phoneDigits)
      ? `https://wa.me/${phoneDigits}`
      : DEFAULT_WHATSAPP_HREF;

  const mapped = (Array.isArray(socials) ? socials : []).map((item) => {
    const label = String(item?.label || "").trim();
    const href = String(item?.href || "").trim() || "#";
    const iconUrl = String(item?.iconUrl || "").trim();
    if (isTwitterLabel(label) || /^whatsapp$/i.test(label)) {
      return {
        label: "WhatsApp",
        href: isWhatsAppHref(href) ? href : fallbackHref,
        iconUrl,
      };
    }
    return { label, href, iconUrl };
  });

  const seen = new Set();
  return mapped.filter((item) => {
    const key = item.label.toLowerCase();
    if (!item.label || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const DEFAULT_SITE_SETTINGS = {
  contact: {
    email: "info@usclt20.com",
    phone: "+91 99999 99999",
    address: "Hyderabad, India",
  },
  socials: [
    { label: "Facebook", href: "#", iconUrl: "" },
    { label: "Instagram", href: "#", iconUrl: "" },
    { label: "LinkedIn", href: "#", iconUrl: "" },
    { label: "YouTube", href: "#", iconUrl: "" },
    { label: "WhatsApp", href: DEFAULT_WHATSAPP_HREF, iconUrl: "" },
  ],
  registrationFees: {
    captain: 999,
    player: 999,
    franchise: 999,
    sponsor: 999,
  },
  portalMedia: {
    images: [],
    videos: [],
  },
  registrationEnabled: true,
  referralProgramEnabled: true,
  moduleVisibility: { ...DEFAULT_MODULE_VISIBILITY },
  paymentGateway: "razorpay",
  whatsappGroupUrl: "",
  referralChallenge: {
    title: "Winners Announcement",
    subtitle: "Of Referral Challenge",
    thankYou: "To everyone who participated in the referral challenge!",
    supportLine: "Your support and enthusiasm made this a huge success.",
    closingLine: "Stay tuned for more exciting opportunities!",
    winners: [
      { place: 1, name: "Raja Shaker", company: "Workcog Inc", gift: "Kashmir Willow Bat" },
      { place: 2, name: "Mohammed Saleem", company: "Xtract IT", gift: "Amazon Voucher" },
      { place: 3, name: "Rakesh M", company: "Intellect Inc", gift: "Amazon Voucher" },
    ],
  },
};

export function normalizeReferralChallenge(input) {
  const src = input && typeof input === "object" ? input : {};
  const fallback = DEFAULT_SITE_SETTINGS.referralChallenge;
  const winners = (Array.isArray(src.winners) ? src.winners : fallback.winners)
    .map((row) => ({
      place: Math.round(Number(row?.place)),
      playerCode: String(row?.playerCode || "").trim(),
      section: String(row?.section || "").toLowerCase() === "giveaway" ? "giveaway" : "referral",
      name: String(row?.name || "").trim(),
      company: String(row?.company || "").trim(),
      gift: String(row?.gift || "").trim(),
    }))
    .filter(
      (row) =>
        row.gift &&
        Number.isFinite(row.place) &&
        row.place > 0 &&
        (row.playerCode || row.name)
    )
    .slice(0, 12)
    .sort((a, b) => a.place - b.place);

  return {
    title: String(src.title || fallback.title).trim() || fallback.title,
    subtitle: String(src.subtitle || fallback.subtitle).trim() || fallback.subtitle,
    thankYou: String(src.thankYou ?? fallback.thankYou).trim(),
    supportLine: String(src.supportLine ?? fallback.supportLine).trim(),
    closingLine: String(src.closingLine ?? fallback.closingLine).trim(),
    winners,
  };
}

export function getReferralChallenge(settings) {
  const stored = settings?.referralChallenge;
  const normalized = normalizeReferralChallenge(
    stored ? stored.toObject?.() || stored : DEFAULT_SITE_SETTINGS.referralChallenge
  );
  if (!normalized.winners.length) {
    return normalizeReferralChallenge(DEFAULT_SITE_SETTINGS.referralChallenge);
  }
  return normalized;
}

function playerCodeLookupKeys(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];
  const digits = raw.replace(/\D/g, "");
  const padded = digits ? formatPlayerCode(Number(digits)) : "";
  return [...new Set([raw, raw.toUpperCase(), padded].filter(Boolean))];
}

export async function resolveReferralChallenge(settings) {
  const challenge = getReferralChallenge(settings);
  const codes = [...new Set(challenge.winners.flatMap((row) => playerCodeLookupKeys(row.playerCode)))];
  const players = codes.length
    ? await PlayerRegistration.find({ playerCode: { $in: codes } })
        .select("playerCode fullName company profileImage photo")
        .lean()
    : [];
  const byCode = new Map(players.map((player) => [String(player.playerCode), player]));

  return {
    ...challenge,
    winners: challenge.winners.map((row) => {
      const player = playerCodeLookupKeys(row.playerCode)
        .map((code) => byCode.get(code))
        .find(Boolean);
      if (!player) {
        return {
          ...row,
          playerCode: row.playerCode ? playerCodeLookupKeys(row.playerCode)[0] : "",
          image: "",
        };
      }
      const image = profileImagePublicUrl(player.profileImage || player.photo?.filename || "");
      return {
        ...row,
        playerCode: player.playerCode,
        name: player.fullName || row.name,
        company: player.company || row.company,
        image,
      };
    }),
  };
}

export async function assertReferralPlayerCodes(winners) {
  const missing = [];
  for (const row of winners) {
    if (!row.playerCode) continue;
    const keys = playerCodeLookupKeys(row.playerCode);
    const player = await PlayerRegistration.findOne({ playerCode: { $in: keys } })
      .select("playerCode")
      .lean();
    if (!player) missing.push(row.playerCode);
    else row.playerCode = player.playerCode;
  }
  return missing;
}

export function getPaymentGateway(settings) {
  const gateway = String(settings?.paymentGateway || "razorpay").toLowerCase();
  if (gateway === "cashfree") return "cashfree";
  if (gateway === "qr") return "qr";
  return "razorpay";
}

export async function getSiteSettings() {
  let doc = await SiteSettings.findOne({ key: "default" });
  if (!doc) {
    doc = await SiteSettings.create({ key: "default", ...DEFAULT_SITE_SETTINGS });
  }

  const nextSocials = normalizeSocials(doc.socials, doc.contact);
  const prev = JSON.stringify((doc.socials || []).map((s) => ({ label: s.label, href: s.href, iconUrl: s.iconUrl || "" })));
  const next = JSON.stringify(nextSocials);
  if (prev !== next) {
    doc.socials = nextSocials;
    await doc.save();
  }

  return doc;
}

export function isRegistrationEnabled(settings) {
  return settings?.registrationEnabled !== false;
}

export function isReferralProgramEnabled(settings) {
  return settings?.referralProgramEnabled !== false;
}

export function getModuleVisibility(settings) {
  return normalizeModuleVisibility(settings?.moduleVisibility);
}

export { normalizeModuleVisibility, DEFAULT_MODULE_VISIBILITY };
