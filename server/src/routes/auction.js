import { Router } from "express";
import { PlayerRegistration } from "../models/PlayerRegistration.js";
import { withProfileImageUrl } from "../middleware/upload.js";
import { resolveFranchiseId, getFranchiseName } from "../utils/franchises.js";

const router = Router();

const TOP_SOLD_MATCH = {
  status: "verified",
  auctionStatus: "sold",
  soldPrice: { $gt: 0 },
  interest: { $in: ["player", "captain"] },
  franchiseId: { $nin: ["", null] },
};

function toPublicSoldPlayer(row, priceRank) {
  const enriched = withProfileImageUrl(row);
  const franchiseId = resolveFranchiseId(enriched.franchiseId);
  return {
    fullName: enriched.fullName || "",
    playerCode: enriched.playerCode || "",
    role: enriched.role || "",
    soldPrice: Number(enriched.soldPrice) || 0,
    priceRank,
    franchiseId,
    franchiseName: enriched.franchiseName || getFranchiseName(franchiseId) || "",
    profileImageUrl: enriched.profileImageUrl || "",
  };
}

/**
 * Public: players sold at the top N distinct hammer prices (ties at each price included).
 */
router.get("/top-sold", async (req, res) => {
  try {
    const priceLimit = Math.min(20, Math.max(1, Number(req.query.limit) || 5));
    const maxPlayers = Math.min(120, Math.max(priceLimit, Number(req.query.maxPlayers) || 60));

    const priceDocs = await PlayerRegistration.aggregate([
      { $match: TOP_SOLD_MATCH },
      { $group: { _id: "$soldPrice" } },
      { $sort: { _id: -1 } },
      { $limit: priceLimit },
    ]);

    const topPrices = priceDocs.map((p) => Number(p._id)).filter((n) => n > 0);
    if (!topPrices.length) {
      return res.json({ players: [], priceTiers: priceLimit });
    }

    const sortedPrices = [...topPrices].sort((a, b) => b - a);
    const priceToRank = new Map(sortedPrices.map((price, index) => [price, index + 1]));

    const rows = await PlayerRegistration.find({
      ...TOP_SOLD_MATCH,
      soldPrice: { $in: sortedPrices },
    })
      .sort({ soldPrice: -1, fullName: 1, playerCode: 1 })
      .limit(maxPlayers)
      .select(
        "fullName playerCode role soldPrice franchiseId franchiseName photo profileImage interest"
      )
      .lean();

    const players = rows.map((row) =>
      toPublicSoldPlayer(row, priceToRank.get(Number(row.soldPrice)) || 0)
    );

    return res.json({ players, priceTiers: priceLimit });
  } catch (error) {
    console.error("auction top-sold error", error);
    return res.status(500).json({ error: "Unable to load top sold players." });
  }
});

export default router;
