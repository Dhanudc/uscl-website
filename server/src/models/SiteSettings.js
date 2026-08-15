import mongoose from "mongoose";

const socialSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    href: { type: String, default: "#" },
    iconUrl: { type: String, default: "" },
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
};

export async function getSiteSettings() {
  let doc = await SiteSettings.findOne({ key: "default" });
  if (!doc) {
    doc = await SiteSettings.create({ key: "default", ...DEFAULT_SITE_SETTINGS });
  }
  return doc;
}
