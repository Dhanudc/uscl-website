import { Router } from "express";
import { LeaderboardEntry } from "../models/LeaderboardEntry.js";
import { Match } from "../models/Match.js";
import { buildPointsTable } from "../utils/points.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const [matches, leaderboard] = await Promise.all([
      Match.find().sort({ scheduledAt: 1 }).lean(),
      LeaderboardEntry.find().sort({ category: 1, sortOrder: 1, value: -1 }).lean(),
    ]);

    const fixtures = matches.filter((m) => m.status === "upcoming" || m.status === "live");
    const results = matches
      .filter((m) => m.status === "completed")
      .slice()
      .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));

    return res.json({
      fixtures,
      schedule: matches,
      results,
      points: buildPointsTable(matches),
      leaderboard,
    });
  } catch (error) {
    console.error("live feed error", error);
    return res.status(500).json({ error: "Unable to load live updates." });
  }
});

export default router;
