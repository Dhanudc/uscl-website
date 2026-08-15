import { Router } from "express";
import { getSiteSettings } from "../models/SiteSettings.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const settings = await getSiteSettings();
    return res.json({
      settings: {
        contact: settings.contact,
        socials: settings.socials,
      },
    });
  } catch (error) {
    console.error("settings error", error);
    return res.status(500).json({ error: "Unable to load site settings." });
  }
});

export default router;
