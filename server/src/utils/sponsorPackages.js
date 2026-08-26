import { PlayerRegistration } from "../models/PlayerRegistration.js";
import { getSiteSettings } from "../models/SiteSettings.js";
import {
  DEFAULT_SPONSOR_PACKAGES,
  isValidSponsorPackageId,
  formatInrLakh,
} from "../constants/sponsorPackages.js";

function normalizePackage(pkg, fallback) {
  const base = fallback || {};
  const priceInr = Math.round(Number(pkg?.priceInr ?? base.priceInr));
  const maxSlots = Math.round(Number(pkg?.maxSlots ?? base.maxSlots));
  return {
    id: base.id,
    title: base.title,
    blurb: base.blurb,
    benefits: base.benefits || [],
    priceInr: Number.isFinite(priceInr) && priceInr > 0 ? priceInr : base.priceInr,
    maxSlots: Number.isFinite(maxSlots) && maxSlots > 0 ? maxSlots : base.maxSlots,
    enabled: pkg?.enabled !== false,
  };
}

export async function getSponsorPackageConfig() {
  const settings = await getSiteSettings();
  const stored = settings.sponsorPackages || [];
  const byId = Object.fromEntries(stored.map((p) => [p.id, p]));

  return DEFAULT_SPONSOR_PACKAGES.map((def) => normalizePackage(byId[def.id], def));
}

export async function getSponsorPackageById(packageId) {
  const id = String(packageId || "").trim();
  if (!isValidSponsorPackageId(id)) return null;
  const packages = await getSponsorPackageConfig();
  const pkg = packages.find((p) => p.id === id && p.enabled);
  if (!pkg) return null;
  return { ...pkg, priceLabel: formatInrLakh(pkg.priceInr) };
}

/** Paid sponsor registrations hold a slot (pending or verified). */
export async function countSponsorPackageSold(packageId) {
  return PlayerRegistration.countDocuments({
    interest: "sponsor",
    sponsorPackageId: packageId,
    status: { $in: ["pending", "verified"] },
    paymentStatus: "paid",
  });
}

export async function getSponsorPackageAvailability(packageId) {
  const pkg = await getSponsorPackageById(packageId);
  if (!pkg) return null;
  const soldCount = await countSponsorPackageSold(packageId);
  const available = Math.max(0, pkg.maxSlots - soldCount);
  return {
    ...pkg,
    priceLabel: formatInrLakh(pkg.priceInr),
    soldCount,
    available,
    isSoldOut: available <= 0,
  };
}

export async function listSponsorPackagesPublic() {
  const packages = await getSponsorPackageConfig();
  const result = [];
  for (const pkg of packages) {
    if (!pkg.enabled) continue;
    const soldCount = await countSponsorPackageSold(pkg.id);
    const available = Math.max(0, pkg.maxSlots - soldCount);
    result.push({
      id: pkg.id,
      title: pkg.title,
      blurb: pkg.blurb,
      benefits: pkg.benefits,
      priceInr: pkg.priceInr,
      priceLabel: formatInrLakh(pkg.priceInr),
      maxSlots: pkg.maxSlots,
      soldCount,
      available,
      isSoldOut: available <= 0,
    });
  }
  return result;
}

export function normalizeSponsorPackagesInput(input) {
  const byId = Object.fromEntries(
    (Array.isArray(input) ? input : []).map((p) => [String(p.id || "").trim(), p])
  );
  return DEFAULT_SPONSOR_PACKAGES.map((def) => {
    const incoming = byId[def.id] || {};
    return normalizePackage(incoming, def);
  });
}

export async function assertSponsorPackageAvailable(packageId) {
  const availability = await getSponsorPackageAvailability(packageId);
  if (!availability) {
    return { ok: false, error: "Invalid sponsor package." };
  }
  if (availability.isSoldOut) {
    return { ok: false, error: `${availability.title} is sold out.` };
  }
  return { ok: true, pkg: availability };
}
