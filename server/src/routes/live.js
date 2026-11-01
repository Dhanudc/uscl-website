import { Router } from "express";
import { LeaderboardEntry } from "../models/LeaderboardEntry.js";
import { Match } from "../models/Match.js";
import { getSiteSettings } from "../models/SiteSettings.js";
import { buildPublicPointsTable, normalizeTeamNetRunRates } from "../utils/points.js";
import { findNextMatchId, pickUpcomingMatches } from "../utils/matchSchedule.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const [matches, leaderboard, settings] = await Promise.all([
      Match.find().sort({ scheduledAt: 1 }).lean(),
      LeaderboardEntry.find().sort({ category: 1, sortOrder: 1, value: -1 }).lean(),
      getSiteSettings(),
    ]);

    const netRunRates = normalizeTeamNetRunRates(settings?.teamNetRunRates);

    const fixtures = pickUpcomingMatches(matches, 2);
    const nextMatchId = findNextMatchId(matches);
    const results = matches
      .filter((m) => m.status === "completed")
      .slice()
      .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));

    return res.json({
      fixtures,
      nextMatchId,
      schedule: matches,
      results,
      points: buildPublicPointsTable(matches, netRunRates),
      leaderboard,
    });
  } catch (error) {
    console.error("live feed error", error);
    return res.status(500).json({ error: "Unable to load live updates." });
  }
});

export default router;
