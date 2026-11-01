import { findFranchise } from "./franchises";

/** USCL T20 Season 2026 — 28 league fixtures (Nov–Dec 2026). Times are 9:00 AM & 12:30 PM US Eastern. */

export const LEAGUE_FIXTURES_2026 = [
  { matchNumber: 1, date: "2026-11-07", slot: "morning", teamAId: "texas-thunder", teamBId: "virginia-vikings" },
  { matchNumber: 2, date: "2026-11-07", slot: "afternoon", teamAId: "california-chargers", teamBId: "new-york-knights" },
  { matchNumber: 3, date: "2026-11-08", slot: "morning", teamAId: "arizona-avengers", teamBId: "chicago-crushers" },
  { matchNumber: 4, date: "2026-11-08", slot: "afternoon", teamAId: "norwin-atlanta-lions", teamBId: "florida-falcons" },
  { matchNumber: 5, date: "2026-11-14", slot: "morning", teamAId: "texas-thunder", teamBId: "new-york-knights" },
  { matchNumber: 6, date: "2026-11-14", slot: "afternoon", teamAId: "california-chargers", teamBId: "florida-falcons" },
  { matchNumber: 7, date: "2026-11-15", slot: "morning", teamAId: "virginia-vikings", teamBId: "chicago-crushers" },
  { matchNumber: 8, date: "2026-11-15", slot: "afternoon", teamAId: "arizona-avengers", teamBId: "norwin-atlanta-lions" },
  { matchNumber: 9, date: "2026-11-21", slot: "morning", teamAId: "texas-thunder", teamBId: "chicago-crushers" },
  { matchNumber: 10, date: "2026-11-21", slot: "afternoon", teamAId: "new-york-knights", teamBId: "florida-falcons" },
  { matchNumber: 11, date: "2026-11-22", slot: "morning", teamAId: "california-chargers", teamBId: "arizona-avengers" },
  { matchNumber: 12, date: "2026-11-22", slot: "afternoon", teamAId: "virginia-vikings", teamBId: "norwin-atlanta-lions" },
  { matchNumber: 13, date: "2026-11-28", slot: "morning", teamAId: "new-york-knights", teamBId: "arizona-avengers" },
  { matchNumber: 14, date: "2026-11-28", slot: "afternoon", teamAId: "texas-thunder", teamBId: "florida-falcons" },
  { matchNumber: 15, date: "2026-11-29", slot: "morning", teamAId: "virginia-vikings", teamBId: "california-chargers" },
  { matchNumber: 16, date: "2026-11-29", slot: "afternoon", teamAId: "chicago-crushers", teamBId: "norwin-atlanta-lions" },
  { matchNumber: 17, date: "2026-12-05", slot: "morning", teamAId: "texas-thunder", teamBId: "norwin-atlanta-lions" },
  { matchNumber: 18, date: "2026-12-05", slot: "afternoon", teamAId: "florida-falcons", teamBId: "arizona-avengers" },
  { matchNumber: 19, date: "2026-12-06", slot: "morning", teamAId: "new-york-knights", teamBId: "virginia-vikings" },
  { matchNumber: 20, date: "2026-12-06", slot: "afternoon", teamAId: "chicago-crushers", teamBId: "california-chargers" },
  { matchNumber: 21, date: "2026-12-12", slot: "morning", teamAId: "norwin-atlanta-lions", teamBId: "california-chargers" },
  { matchNumber: 22, date: "2026-12-12", slot: "afternoon", teamAId: "texas-thunder", teamBId: "arizona-avengers" },
  { matchNumber: 23, date: "2026-12-13", slot: "morning", teamAId: "florida-falcons", teamBId: "virginia-vikings" },
  { matchNumber: 24, date: "2026-12-13", slot: "afternoon", teamAId: "chicago-crushers", teamBId: "new-york-knights" },
  { matchNumber: 25, date: "2026-12-19", slot: "morning", teamAId: "norwin-atlanta-lions", teamBId: "new-york-knights" },
  { matchNumber: 26, date: "2026-12-19", slot: "afternoon", teamAId: "texas-thunder", teamBId: "california-chargers" },
  { matchNumber: 27, date: "2026-12-20", slot: "morning", teamAId: "florida-falcons", teamBId: "chicago-crushers" },
  { matchNumber: 28, date: "2026-12-20", slot: "afternoon", teamAId: "arizona-avengers", teamBId: "virginia-vikings" },
];

export function fixtureSlotToDate(dateStr, slot) {
  const hour = slot === "morning" ? 9 : 12;
  const minute = slot === "morning" ? 0 : 30;
  return new Date(
    `${dateStr}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-05:00`
  );
}

/** Fallback when /api/live returns no matches (e.g. API error or empty DB). */
export function buildStaticLeagueSchedule() {
  return LEAGUE_FIXTURES_2026.map((row) => {
    const teamA = findFranchise(row.teamAId);
    const teamB = findFranchise(row.teamBId);
    return {
      _id: `static-${row.matchNumber}`,
      matchNumber: row.matchNumber,
      stage: "league",
      teamAId: row.teamAId,
      teamAName: teamA?.name || row.teamAId,
      teamBId: row.teamBId,
      teamBName: teamB?.name || row.teamBId,
      scheduledAt: fixtureSlotToDate(row.date, row.slot).toISOString(),
      venue: "",
      status: "upcoming",
      teamAScore: "",
      teamBScore: "",
      resultSummary: "",
    };
  });
}
