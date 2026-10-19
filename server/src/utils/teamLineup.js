import { PlayerRegistration } from "../models/PlayerRegistration.js";
import { TeamLineup } from "../models/TeamLineup.js";
import { resolveFranchiseId, getFranchiseName } from "./franchises.js";
import { isValidPlayerRole } from "../constants/playerRoles.js";
import { withProfileImageUrl } from "../middleware/upload.js";
import { formatTeamCaptainPublic } from "./teamCaptain.js";
import { findMentorByUserId, getMentorForFranchise, mentorPublicView } from "./teamMentor.js";

const SQUAD_SELECT =
  "fullName playerCode phone email company role interest franchiseId franchiseName auctionStatus status photo profileImage soldPrice userId";

export async function fetchSoldSquadRegistrations(franchiseId) {
  const fid = resolveFranchiseId(franchiseId);
  if (!fid) return [];
  return PlayerRegistration.find({
    status: "verified",
    auctionStatus: "sold",
    franchiseId: fid,
    interest: { $in: ["player", "captain"] },
  })
    .select(SQUAD_SELECT)
    .sort({ fullName: 1 })
    .lean();
}

export async function getUserRegistrationForLineup(userId) {
  const rows = await PlayerRegistration.find({
    userId,
    status: "verified",
    auctionStatus: "sold",
    franchiseId: { $ne: "" },
    interest: { $in: ["player", "captain"] },
  })
    .select(SQUAD_SELECT)
    .lean();
  return rows[0] || null;
}

function defaultSquadRoleForReg(reg) {
  if (String(reg.interest || "").toLowerCase() === "captain") return "captain";
  return "player";
}

export async function ensureLineupDocument(franchiseId) {
  const fid = resolveFranchiseId(franchiseId);
  let doc = await TeamLineup.findOne({ franchiseId: fid });
  if (doc) return doc;

  const squad = await fetchSoldSquadRegistrations(fid);
  const entries = squad.map((reg, index) => ({
    registrationId: reg._id,
    order: index + 1,
    squadRole: defaultSquadRoleForReg(reg),
    playingRole: String(reg.role || ""),
  }));

  let captainCount = entries.filter((e) => e.squadRole === "captain").length;
  if (!captainCount && entries.length) {
    entries[0].squadRole = "captain";
  }

  doc = await TeamLineup.create({ franchiseId: fid, entries });
  return doc;
}

export function squadRoleForRegistration(lineupDoc, registrationId) {
  const id = String(registrationId);
  const entry = (lineupDoc?.entries || []).find((e) => String(e.registrationId) === id);
  return entry?.squadRole || "player";
}

export async function findLineupCaptainRegistration(franchiseId) {
  const fid = resolveFranchiseId(franchiseId);
  if (!fid) return null;
  const doc = await TeamLineup.findOne({ franchiseId: fid }).lean();
  if (doc?.entries?.length) {
    const cap = doc.entries.find((e) => e.squadRole === "captain");
    if (cap?.registrationId) {
      const row = await PlayerRegistration.findById(cap.registrationId).select(
        "fullName playerCode phone franchiseId franchiseName status"
      ).lean();
      if (row && row.status === "verified") return formatTeamCaptainPublic(row);
    }
  }
  return null;
}

export async function findLineupCaptainsByFranchiseIds(franchiseIds) {
  const ids = [...new Set((franchiseIds || []).map((id) => resolveFranchiseId(id)).filter(Boolean))];
  const map = {};
  if (!ids.length) return map;

  const docs = await TeamLineup.find({ franchiseId: { $in: ids } }).lean();
  const capIds = [];
  const capByFranchise = {};
  for (const doc of docs) {
    const cap = (doc.entries || []).find((e) => e.squadRole === "captain");
    if (cap?.registrationId) {
      capIds.push(cap.registrationId);
      capByFranchise[doc.franchiseId] = cap.registrationId;
    }
  }

  const regs = await PlayerRegistration.find({ _id: { $in: capIds }, status: "verified" })
    .select("fullName playerCode phone franchiseId franchiseName")
    .lean();
  const regById = Object.fromEntries(regs.map((r) => [String(r._id), r]));

  for (const fid of ids) {
    const regId = capByFranchise[fid];
    if (regId) {
      const formatted = formatTeamCaptainPublic(regById[String(regId)]);
      if (formatted) map[fid] = formatted;
    }
  }
  return map;
}

/** Squad roles from saved lineups for player dashboard / team cards. */
export async function squadRoleMapForRegistrations(regs) {
  const franchiseIds = [
    ...new Set(
      (regs || []).map((r) => resolveFranchiseId(r.franchiseId)).filter(Boolean)
    ),
  ];
  if (!franchiseIds.length) return {};

  const docs = await TeamLineup.find({ franchiseId: { $in: franchiseIds } }).lean();
  const map = {};
  for (const doc of docs) {
    for (const entry of doc.entries || []) {
      map[String(entry.registrationId)] = entry.squadRole;
    }
  }
  return map;
}

export function resolveSquadRoleForReg(reg, roleMap = {}) {
  const id = String(reg?._id || reg?.id || "");
  const fromLineup = id ? roleMap[id] : "";
  if (fromLineup) return fromLineup;
  if (String(reg?.interest || "").toLowerCase() === "captain") return "captain";
  return "player";
}

function mergeLineupWithSquad(lineupDoc, squad) {
  const squadById = new Map(squad.map((r) => [String(r._id), r]));
  const entries = [...(lineupDoc.entries || [])]
    .filter((e) => squadById.has(String(e.registrationId)))
    .sort((a, b) => a.order - b.order);

  const inLineup = new Set(entries.map((e) => String(e.registrationId)));
  for (const reg of squad) {
    if (!inLineup.has(String(reg._id))) {
      entries.push({
        registrationId: reg._id,
        order: entries.length + 1,
        squadRole: defaultSquadRoleForReg(reg),
        playingRole: String(reg.role || ""),
      });
    }
  }

  entries.sort((a, b) => a.order - b.order);
  return entries.map((entry, index) => {
    const reg = squadById.get(String(entry.registrationId));
    return {
      registrationId: String(entry.registrationId),
      order: index + 1,
      squadRole: entry.squadRole || "player",
      playingRole: entry.playingRole || reg?.role || "",
      player: withProfileImageUrl(reg),
    };
  });
}

async function buildLineupPayloadForFranchise(fid, { permissions, myRegistrationId = null }) {
  const squad = await fetchSoldSquadRegistrations(fid);
  const lineupDoc = await ensureLineupDocument(fid);
  const rows = mergeLineupWithSquad(lineupDoc, squad);
  const teamMentor = mentorPublicView(await getMentorForFranchise(fid));
  return {
    team: {
      id: fid,
      name: getFranchiseName(fid),
    },
    lineup: rows,
    teamMentor,
    permissions,
    myRegistrationId,
  };
}

export async function buildLineupPayloadForUser(userId) {
  const me = await getUserRegistrationForLineup(userId);
  if (me) {
    const fid = resolveFranchiseId(me.franchiseId);
    const squad = await fetchSoldSquadRegistrations(fid);
    const lineupDoc = await ensureLineupDocument(fid);
    const rows = mergeLineupWithSquad(lineupDoc, squad);

    const myId = String(me._id);
    const myEntry = rows.find((r) => r.registrationId === myId);
    const mySquadRole = myEntry?.squadRole || defaultSquadRoleForReg(me);
    const isCaptain =
      mySquadRole === "captain" || String(me.interest || "").toLowerCase() === "captain";
    const canView = ["captain", "vice_captain", "player"].includes(mySquadRole) || isCaptain;
    const canEdit = isCaptain;

    if (!canView) {
      return { error: "FORBIDDEN", status: 403, message: "Unable to view team lineup." };
    }

    const teamMentor = mentorPublicView(await getMentorForFranchise(fid));
    return {
      team: {
        id: fid,
        name: getFranchiseName(fid) || me.franchiseName,
      },
      lineup: rows,
      teamMentor,
      permissions: { canEdit, canView, mySquadRole: isCaptain ? "captain" : mySquadRole },
      myRegistrationId: myId,
    };
  }

  const mentor = await findMentorByUserId(userId);
  if (!mentor) {
    return { error: "NO_SQUAD", status: 403, message: "You are not on a sold franchise squad yet." };
  }

  const fid = resolveFranchiseId(mentor.franchiseId);
  return buildLineupPayloadForFranchise(fid, {
    permissions: { canEdit: true, canView: true, mySquadRole: "mentor" },
    myRegistrationId: null,
  });
}

function normalizeIncomingEntries(raw, squadIds) {
  const allowed = new Set(squadIds.map(String));
  const list = Array.isArray(raw) ? raw : [];
  const out = [];
  for (const item of list) {
    const registrationId = String(item.registrationId || "").trim();
    if (!allowed.has(registrationId)) continue;
    let squadRole = String(item.squadRole || "player").toLowerCase();
    if (!["captain", "vice_captain", "player"].includes(squadRole)) squadRole = "player";
    const order = Number(item.order);
    const playingRole = String(item.playingRole || "").trim();
    out.push({
      registrationId,
      order: Number.isFinite(order) && order > 0 ? order : out.length + 1,
      squadRole,
      playingRole: isValidPlayerRole(playingRole) ? playingRole : "",
    });
  }
  out.sort((a, b) => a.order - b.order);
  return out.map((row, i) => ({ ...row, order: i + 1 }));
}

export async function saveLineupForCaptain(userId, body) {
  const access = await buildLineupPayloadForUser(userId);
  if (access.error) {
    return { error: access.error, status: access.status, message: access.message };
  }
  if (!access.permissions?.canEdit) {
    return { error: "FORBIDDEN", status: 403, message: "Only the team captain or mentor can edit the lineup." };
  }

  const fid = access.team.id;
  const squad = await fetchSoldSquadRegistrations(fid);
  const squadIds = squad.map((r) => r._id);

  await ensureLineupDocument(fid);
  const lineupDoc = await TeamLineup.findOne({ franchiseId: fid });
  const me = await getUserRegistrationForLineup(userId);

  let entries = normalizeIncomingEntries(body.entries, squadIds);
  if (!entries.length) {
    return { error: "VALIDATION", status: 400, message: "Lineup cannot be empty." };
  }

  const captains = entries.filter((e) => e.squadRole === "captain");
  if (captains.length !== 1) {
    return { error: "VALIDATION", status: 400, message: "Assign exactly one team captain." };
  }

  const vice = entries.filter((e) => e.squadRole === "vice_captain");
  if (vice.length > 1) {
    return { error: "VALIDATION", status: 400, message: "Assign at most one vice captain." };
  }

  lineupDoc.entries = entries.map((e) => ({
    registrationId: e.registrationId,
    order: e.order,
    squadRole: e.squadRole,
    playingRole: e.playingRole,
  }));
  lineupDoc.updatedByRegistrationId = me?._id || null;
  await lineupDoc.save();

  for (const entry of entries) {
    if (!entry.playingRole) continue;
    await PlayerRegistration.updateOne(
      { _id: entry.registrationId },
      { $set: { role: entry.playingRole } }
    );
  }

  return { ok: true };
}

/** Admin: toggle registration interest player/captain and sync lineup squad roles. */
export async function syncRegistrationInterestWithLineup(registration, newInterest) {
  const fid = resolveFranchiseId(registration?.franchiseId);
  if (!fid) return;

  const regId = String(registration._id);
  const interest = String(newInterest || "").toLowerCase();
  const lineupDoc = await ensureLineupDocument(fid);
  const squad = await fetchSoldSquadRegistrations(fid);
  const squadIds = new Set(squad.map((r) => String(r._id)));

  let entries = [...(lineupDoc.entries || [])].filter((e) => squadIds.has(String(e.registrationId)));

  for (const reg of squad) {
    if (!entries.some((e) => String(e.registrationId) === String(reg._id))) {
      entries.push({
        registrationId: reg._id,
        order: entries.length + 1,
        squadRole: defaultSquadRoleForReg(reg),
        playingRole: String(reg.role || ""),
      });
    }
  }

  if (interest === "captain") {
    entries = entries.map((e) => {
      if (String(e.registrationId) === regId) {
        return { ...e, squadRole: "captain" };
      }
      if (e.squadRole === "captain") {
        return { ...e, squadRole: "player" };
      }
      return e;
    });
  } else if (interest === "player") {
    entries = entries.map((e) =>
      String(e.registrationId) === regId ? { ...e, squadRole: "player" } : e
    );
  }

  entries.sort((a, b) => a.order - b.order);
  lineupDoc.entries = entries.map((e, i) => ({ ...e, order: i + 1 }));
  await lineupDoc.save();
}

export async function removeRegistrationFromLineup(franchiseId, registrationId) {
  const fid = resolveFranchiseId(franchiseId);
  if (!fid) return;
  const doc = await TeamLineup.findOne({ franchiseId: fid });
  if (!doc?.entries?.length) return;
  const regId = String(registrationId);
  const next = doc.entries.filter((e) => String(e.registrationId) !== regId);
  if (next.length === doc.entries.length) return;
  doc.entries = next.map((e, i) => ({ ...e, order: i + 1 }));
  await doc.save();
}

export async function addRegistrationToLineup(franchiseId, registrationId, { squadRole, order } = {}) {
  const fid = resolveFranchiseId(franchiseId);
  if (!fid) return;
  const doc = await ensureLineupDocument(fid);
  const regId = String(registrationId);
  const reg = await PlayerRegistration.findById(registrationId).select("role interest").lean();
  let entries = [...(doc.entries || [])].filter((e) => String(e.registrationId) !== regId);
  const slotOrder = order ?? entries.length + 1;
  entries.push({
    registrationId,
    order: slotOrder,
    squadRole: squadRole || defaultSquadRoleForReg(reg || {}),
    playingRole: String(reg?.role || ""),
  });
  entries.sort((a, b) => a.order - b.order);
  doc.entries = entries.map((e, i) => ({ ...e, order: i + 1 }));
  await doc.save();
}

export async function replaceSoldMemberInLineup(franchiseId, outgoingRegId, incomingRegId) {
  const fid = resolveFranchiseId(franchiseId);
  if (!fid) return;
  const doc = await ensureLineupDocument(fid);
  const outId = String(outgoingRegId);
  const inId = String(incomingRegId);
  const idx = (doc.entries || []).findIndex((e) => String(e.registrationId) === outId);
  const preservedOrder = idx >= 0 ? doc.entries[idx].order : (doc.entries?.length || 0) + 1;
  let preservedRole = "player";
  if (idx >= 0 && doc.entries[idx].squadRole !== "captain") {
    preservedRole = doc.entries[idx].squadRole;
  }
  let entries = (doc.entries || []).filter(
    (e) => String(e.registrationId) !== outId && String(e.registrationId) !== inId
  );
  const reg = await PlayerRegistration.findById(incomingRegId).select("role interest").lean();
  entries.push({
    registrationId: incomingRegId,
    order: preservedOrder,
    squadRole: preservedRole,
    playingRole: String(reg?.role || ""),
  });
  entries.sort((a, b) => a.order - b.order);
  doc.entries = entries.map((e, i) => ({ ...e, order: i + 1 }));
  await doc.save();
}
