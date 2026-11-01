/**
 * Seed 28 league fixtures for USCL 2026.
 * Usage (from server/): node scripts/seed-league-fixtures-2026.mjs
 * Replace existing league fixtures in Nov–Dec 2026: node scripts/seed-league-fixtures-2026.mjs --replace
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "../src/config/db.js";
import { Match } from "../src/models/Match.js";
import { getFranchiseName } from "../src/utils/franchises.js";
import { fixtureSlotToDate, LEAGUE_FIXTURES_2026 } from "../src/data/leagueFixtures2026.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const replace = process.argv.includes("--replace");

async function main() {
  await connectDB();

  if (replace) {
    const removed = await Match.deleteMany({
      stage: "league",
      scheduledAt: { $gte: new Date("2026-11-01T00:00:00.000Z"), $lte: new Date("2026-12-31T23:59:59.999Z") },
    });
    console.log(`Removed ${removed.deletedCount} existing league matches in Nov–Dec 2026.`);
  }

  const existing = await Match.countDocuments({ matchNumber: { $gte: 1, $lte: 28 }, stage: "league" });
  if (existing >= 28 && !replace) {
    console.log(`Already have ${existing} numbered league matches. Pass --replace to reload fixtures.`);
    process.exit(0);
  }

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
  console.log(`Inserted ${docs.length} league fixtures for Season 2026.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
