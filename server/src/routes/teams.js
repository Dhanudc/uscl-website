import { Router } from "express";
import { PlayerRegistration } from "../models/PlayerRegistration.js";
import { withProfileImageUrl } from "../middleware/upload.js";
import { FRANCHISES } from "../utils/franchises.js";

const router = Router();

/** Public: list franchises with sold player counts. */
router.get("/", async (_req, res) => {
  try {
    const sold = await PlayerRegistration.find({
      status: "verified",
      auctionStatus: "sold",
      franchiseId: { $ne: "" },
    })
      .select("franchiseId")
      .lean();

    const counts = {};
    for (const row of sold) {
      counts[row.franchiseId] = (counts[row.franchiseId] || 0) + 1;
    }

    return res.json({
      teams: FRANCHISES.map((f) => ({
        ...f,
        playerCount: counts[f.id] || 0,
      })),
    });
  } catch (error) {
    console.error("public teams list error", error);
    return res.status(500).json({ error: "Unable to load teams." });
  }
});

/** Public: sold players for one franchise (profile pic, name, role). */
router.get("/:franchiseId/players", async (req, res) => {
  try {
    const franchiseId = String(req.params.franchiseId || "").trim();
    const team = FRANCHISES.find((f) => f.id === franchiseId);
    if (!team) {
      return res.status(404).json({ error: "Team not found." });
    }

    const players = await PlayerRegistration.find({
      status: "verified",
      auctionStatus: "sold",
      franchiseId,
    })
      .select("fullName role company photo profileImage soldPrice franchiseName")
      .sort({ fullName: 1 })
      .lean();

    return res.json({
      team,
      players: players.map(withProfileImageUrl),
    });
  } catch (error) {
    console.error("public team players error", error);
    return res.status(500).json({ error: "Unable to load team players." });
  }
});

export default router;
