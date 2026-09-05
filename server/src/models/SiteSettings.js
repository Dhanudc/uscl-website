import mongoose from "mongoose";
import {
  DEFAULT_MODULE_VISIBILITY,
  normalizeModuleVisibility,
} from "../constants/siteModules.js";

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
        { label: "Twitter (X)", href: "#", iconUrl: "" },
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
    /** Show/hide public module links (Media, Live, Wesley, etc.). */
    moduleVisibility: {
      type: moduleVisibilitySchema,
      default: () => ({ ...DEFAULT_MODULE_VISIBILITY }),
    },
    /** Active online payment gateway for registrations. */
    paymentGateway: {
      type: String,
      enum: ["razorpay", "cashfree"],
      default: "razorpay",
    },
  },
  { timestamps: true }
);

export const SiteSettings =
  mongoose.models.SiteSettings || mongoose.model("SiteSettings", siteSettingsSchema);

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
    { label: "Twitter (X)", href: "#", iconUrl: "" },
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
  moduleVisibility: { ...DEFAULT_MODULE_VISIBILITY },
  paymentGateway: "razorpay",
};

export function getPaymentGateway(settings) {
  const gateway = String(settings?.paymentGateway || "razorpay").toLowerCase();
  return gateway === "cashfree" ? "cashfree" : "razorpay";
}

export async function getSiteSettings() {
  let doc = await SiteSettings.findOne({ key: "default" });
  if (!doc) {
    doc = await SiteSettings.create({ key: "default", ...DEFAULT_SITE_SETTINGS });
  }
  return doc;
}

export function isRegistrationEnabled(settings) {
  return settings?.registrationEnabled !== false;
}

export function getModuleVisibility(settings) {
  return normalizeModuleVisibility(settings?.moduleVisibility);
}

export { normalizeModuleVisibility, DEFAULT_MODULE_VISIBILITY };
