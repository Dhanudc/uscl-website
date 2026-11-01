import { Match } from "../models/Match.js";
import { fixtureSlotToDate, LEAGUE_FIXTURES_2026 } from "../data/leagueFixtures2026.js";
import { getFranchiseName } from "./franchises.js";

/** Insert official 28 league fixtures when the database has none yet. */
export async function ensureLeagueFixtures2026() {
  const existing = await Match.countDocuments({ stage: "league", matchNumber: { $gte: 1, $lte: 28 } });
  if (existing >= 28) return 0;

  const docs = LEAGUE_FIXTURES_2026.map((row) => ({
    matchNumber: row.matchNumber,
    stage: "league",
    teamAId: row.teamAId,
    teamAName: getFranchiseName(row.teamAId),
    teamBId: row.teamBId,
    teamBName: getFranchiseName(row.teamBId),
    scheduledAt: fixtureSlotToDate(row.date, row.slot),
    venue: "",
    status: "upcoming",
    teamAScore: "",
    teamBScore: "",
    winnerId: "",
    winnerName: "",
    resultSummary: "",
  }));

  await Match.insertMany(docs);
  return docs.length;
}
