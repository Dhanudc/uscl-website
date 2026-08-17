import { Router } from "express";
import { PlayerRegistration } from "../models/PlayerRegistration.js";
import { withProfileImageUrl } from "../middleware/upload.js";
import { FRANCHISES } from "../utils/franchises.js";

const router = Router();

/** Public: list franchises with sold player counts and assigned owners. */
router.get("/", async (_req, res) => {
  try {
    const [sold, owners] = await Promise.all([
      PlayerRegistration.find({
        status: "verified",
        auctionStatus: "sold",
        franchiseId: { $ne: "" },
      })
        .select("franchiseId")
        .lean(),
      PlayerRegistration.find({
        interest: "franchise",
        status: { $in: ["pending", "verified"] },
        franchiseId: { $ne: "" },
      })
        .select("fullName company phone photo profileImage franchiseId franchiseName status")
        .lean(),
    ]);

    const counts = {};
    for (const row of sold) {
      counts[row.franchiseId] = (counts[row.franchiseId] || 0) + 1;
    }

    const ownerByTeam = {};
    for (const owner of owners.map(withProfileImageUrl)) {
      if (!ownerByTeam[owner.franchiseId]) ownerByTeam[owner.franchiseId] = owner;
    }

    return res.json({
      teams: FRANCHISES.map((f) => ({
        ...f,
        playerCount: counts[f.id] || 0,
        owner: ownerByTeam[f.id]
          ? {
              fullName: ownerByTeam[f.id].fullName,
              company: ownerByTeam[f.id].company,
              phone: ownerByTeam[f.id].phone || "",
              profileImageUrl: ownerByTeam[f.id].profileImageUrl || "",
              photo: ownerByTeam[f.id].photo || null,
              status: ownerByTeam[f.id].status,
            }
          : null,
        available: !ownerByTeam[f.id],
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
