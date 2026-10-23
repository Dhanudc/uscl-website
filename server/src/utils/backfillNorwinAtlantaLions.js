import { PlayerRegistration } from "../models/PlayerRegistration.js";
import { TeamMentor } from "../models/TeamMentor.js";
import { TeamLineup } from "../models/TeamLineup.js";
import { getFranchiseName } from "./franchises.js";

const NEW_ID = "norwin-atlanta-lions";
const LEGACY_IDS = ["new-jersey-jaguars", "atlanta-lions"];

async function migrateLegacyMentors() {
  let modified = 0;
  for (const legacyId of LEGACY_IDS) {
    const legacy = await TeamMentor.findOne({ franchiseId: legacyId });
    if (!legacy) continue;

    const canonical = await TeamMentor.findOne({ franchiseId: NEW_ID });
    if (canonical) {
      await TeamMentor.deleteOne({ _id: legacy._id });
    } else {
      legacy.franchiseId = NEW_ID;
      await legacy.save();
    }
    modified += 1;
  }
  return modified;
}

async function migrateLegacyLineups() {
  let modified = 0;
  for (const legacyId of LEGACY_IDS) {
    const legacy = await TeamLineup.findOne({ franchiseId: legacyId });
    if (!legacy) continue;

    const canonical = await TeamLineup.findOne({ franchiseId: NEW_ID });
    if (canonical) {
      const seen = new Set((canonical.entries || []).map((e) => String(e.registrationId)));
      for (const entry of legacy.entries || []) {
        const regId = String(entry.registrationId);
        if (!seen.has(regId)) {
          canonical.entries.push(entry);
          seen.add(regId);
        }
      }
      canonical.entries = (canonical.entries || []).map((e, i) => ({ ...e, order: i + 1 }));
      await canonical.save();
      await TeamLineup.deleteOne({ _id: legacy._id });
    } else {
      legacy.franchiseId = NEW_ID;
      await legacy.save();
    }
    modified += 1;
  }
  return modified;
}

/** Jaguars franchise → Norwin Atlanta Lions (id + stored name). Safe if both lineups exist. */
export async function backfillNorwinAtlantaLionsTeam() {
  const newName = getFranchiseName(NEW_ID);
  let modified = 0;

  const byLegacyId = await PlayerRegistration.updateMany(
    { franchiseId: { $in: LEGACY_IDS } },
    { $set: { franchiseId: NEW_ID, franchiseName: newName } }
  );
  modified += byLegacyId.modifiedCount || 0;

  const byLegacyName = await PlayerRegistration.updateMany(
    {
      franchiseName: { $regex: /^new\s*jersey\s*jaguars$/i },
      franchiseId: { $nin: [NEW_ID] },
    },
    { $set: { franchiseId: NEW_ID, franchiseName: newName } }
  );
  modified += byLegacyName.modifiedCount || 0;

  const nameOnly = await PlayerRegistration.updateMany(
    { franchiseId: NEW_ID, franchiseName: { $regex: /^new\s*jersey\s*jaguars$/i } },
    { $set: { franchiseName: newName } }
  );
  modified += nameOnly.modifiedCount || 0;

  modified += await migrateLegacyMentors();
  modified += await migrateLegacyLineups();

  return modified;
}
