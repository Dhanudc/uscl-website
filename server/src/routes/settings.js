import { Router } from "express";
import {
  getModuleVisibility,
  getSiteSettings,
  isRegistrationEnabled,
} from "../models/SiteSettings.js";
import { buildPortalMediaResponse } from "../utils/portalMedia.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const settings = await getSiteSettings();
    return res.json({
      settings: {
        contact: settings.contact,
        socials: settings.socials,
        registrationEnabled: isRegistrationEnabled(settings),
        moduleVisibility: getModuleVisibility(settings),
      },
    });
  } catch (error) {
    console.error("settings error", error);
    return res.status(500).json({ error: "Unable to load site settings." });
  }
});

router.get("/portal-media", async (_req, res) => {
  try {
    const settings = await getSiteSettings();
    return res.json({
      portalMedia: buildPortalMediaResponse(settings.portalMedia || { images: [], videos: [] }),
    });
  } catch (error) {
    console.error("portal-media error", error);
    return res.status(500).json({ error: "Unable to load portal media." });
  }
});

export default router;
