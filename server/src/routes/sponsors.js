import { Router } from "express";
import { listSponsorPackagesPublic } from "../utils/sponsorPackages.js";

const router = Router();

router.get("/packages", async (_req, res) => {
  try {
    const packages = await listSponsorPackagesPublic();
    const totalSlots = packages.reduce((sum, p) => sum + p.maxSlots, 0);
    const totalSold = packages.reduce((sum, p) => sum + p.soldCount, 0);
    return res.json({
      packages,
      summary: {
        totalSlots,
        totalSold,
        totalAvailable: Math.max(0, totalSlots - totalSold),
      },
    });
  } catch (error) {
    console.error("sponsor packages error", error);
    return res.status(500).json({ error: "Unable to load sponsor packages." });
  }
});

export default router;
