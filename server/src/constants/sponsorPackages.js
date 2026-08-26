/** Fixed sponsor package catalog — admins adjust price/slots in Site Settings. */

export const SPONSOR_PACKAGE_IDS = ["title", "co", "powered", "associate", "tournament"];

export const DEFAULT_SPONSOR_PACKAGES = [
  {
    id: "title",
    title: "Title Sponsor",
    priceInr: 2500000,
    maxSlots: 1,
    blurb: "Lead the season with maximum brand presence across matches, media, and digital surfaces.",
    benefits: [
      "Title naming rights",
      "Main stage & broadcast branding",
      "Opening & closing ceremony presence",
      "Premium digital & social package",
    ],
  },
  {
    id: "co",
    title: "Co-Sponsor",
    priceInr: 1500000,
    maxSlots: 1,
    blurb: "Share the spotlight across fixtures, auctions, and league communications.",
    benefits: [
      "Co-branding on key assets",
      "On-ground visibility",
      "Auction desk branding",
      "Social media features",
    ],
  },
  {
    id: "powered",
    title: "Powered By",
    priceInr: 1000000,
    maxSlots: 1,
    blurb: "Power the league experience across player journey and fan touchpoints.",
    benefits: [
      "Powered-by lockup",
      "Player kit / digital badges",
      "Highlight reel mentions",
      "Newsletter placement",
    ],
  },
  {
    id: "associate",
    title: "Associate Sponsors",
    priceInr: 300000,
    maxSlots: 50,
    blurb: "Associate your brand with India's biggest staffing franchise cricket league.",
    benefits: [
      "Logo on associate wall",
      "Website listing",
      "Social shout-outs",
      "Networking access",
    ],
  },
  {
    id: "tournament",
    title: "Tournament Partner",
    priceInr: 150000,
    maxSlots: 27,
    blurb: "Support logistics, hospitality, media, and match-day delivery.",
    benefits: [
      "Partner branding on event assets",
      "On-ground partner booth",
      "Social recognition",
      "Networking with franchise owners",
    ],
  },
];

export function isValidSponsorPackageId(id) {
  return SPONSOR_PACKAGE_IDS.includes(String(id || "").trim());
}

export function formatInrLakh(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 100000) {
    const lakh = n / 100000;
    return lakh % 1 === 0 ? `₹${lakh}L` : `₹${lakh.toFixed(1)}L`;
  }
  return `₹${n.toLocaleString("en-IN")}`;
}
