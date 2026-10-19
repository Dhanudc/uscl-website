import { PlayerRegistration } from "../models/PlayerRegistration.js";
import { resolveFranchiseId } from "./franchises.js";

const CAPTAIN_SELECT = "fullName playerCode phone franchiseId franchiseName";

export function formatTeamCaptainPublic(row) {
  if (!row) return null;
  const phone = String(row.phone || "").trim();
  const fullName = String(row.fullName || "").trim();
  const playerCode = String(row.playerCode || "").trim();
  if (!fullName && !playerCode && !phone) return null;
  return {
    fullName,
    playerCode,
    phone,
    franchiseId: resolveFranchiseId(row.franchiseId),
    franchiseName: String(row.franchiseName || "").trim(),
  };
}

/** Verified captain assigned to a franchise (one per team enforced on admin assign). */
export async function findTeamCaptainByFranchiseId(franchiseId, { excludeRegistrationId } = {}) {
  const id = resolveFranchiseId(franchiseId);
  if (!id) return null;
  const query = {
    interest: "captain",
    status: "verified",
    franchiseId: id,
  };
  if (excludeRegistrationId) {
    query._id = { $ne: excludeRegistrationId };
  }
  const row = await PlayerRegistration.findOne(query).select(CAPTAIN_SELECT).sort({ updatedAt: -1 }).lean();
  return formatTeamCaptainPublic(row);
}

async function findLegacyCaptainsByFranchiseIds(franchiseIds) {
  const ids = [...new Set((franchiseIds || []).map((id) => resolveFranchiseId(id)).filter(Boolean))];
  if (!ids.length) return {};
  const rows = await PlayerRegistration.find({
    interest: "captain",
    status: "verified",
    franchiseId: { $in: ids },
  })
    .select(CAPTAIN_SELECT)
    .sort({ updatedAt: -1 })
    .lean();

  const map = {};
  for (const row of rows) {
    const key = resolveFranchiseId(row.franchiseId);
    if (key && !map[key]) {
      map[key] = formatTeamCaptainPublic(row);
    }
  }
  return map;
}

export async function findTeamCaptainsByFranchiseIds(franchiseIds) {
  const ids = [...new Set((franchiseIds || []).map((id) => resolveFranchiseId(id)).filter(Boolean))];
  if (!ids.length) return {};

  const { findLineupCaptainsByFranchiseIds } = await import("./teamLineup.js");
  const fromLineup = await findLineupCaptainsByFranchiseIds(ids);
  const missing = ids.filter((id) => !fromLineup[id]);
  if (!missing.length) return fromLineup;

  const legacy = await findLegacyCaptainsByFranchiseIds(missing);
  return { ...legacy, ...fromLineup };
}

export function playerShouldSeeTeamCaptain(reg) {
  if (!reg) return false;
  const interest = String(reg.interest || "").toLowerCase();
  if (interest !== "player" && interest !== "captain") return false;
  if (String(reg.auctionStatus || "").toLowerCase() !== "sold") return false;
  return Boolean(resolveFranchiseId(reg.franchiseId));
}
