import { PlayerActivity } from "../models/PlayerActivity.js";

/**
 * Store a registration-scoped activity (only call when a real change happened).
 */
export async function recordPlayerActivity({
  registrationId,
  userId = null,
  action,
  summary,
  actorName = "",
  actorRole = "player",
  details = {},
}) {
  if (!registrationId || !action || !summary) return null;
  try {
    return await PlayerActivity.create({
      registrationId,
      userId: userId || null,
      action,
      summary,
      actorName: actorName || "",
      actorRole: actorRole === "admin" ? "admin" : actorRole === "system" ? "system" : "player",
      details: details || {},
    });
  } catch (error) {
    console.error("player activity error", error);
    return null;
  }
}
