import { PlayerRegistration } from "../models/PlayerRegistration.js";

/**
 * Backfill profileImage column from legacy photo.filename / photo.url.
 * Files themselves stay in server/public/profile-images/.
 */
export async function backfillProfileImageColumn() {
  const docs = await PlayerRegistration.find({
    $or: [{ profileImage: { $exists: false } }, { profileImage: "" }, { profileImage: null }],
  }).select("_id photo profileImage");

  let updated = 0;
  for (const doc of docs) {
    const fromPhoto = doc.photo?.filename || "";
    let fromUrl = "";
    if (doc.photo?.url) {
      const parts = String(doc.photo.url).split("/");
      fromUrl = parts[parts.length - 1] || "";
    }
    const filename = String(fromPhoto || fromUrl).trim();
    if (!filename) continue;
    doc.profileImage = filename;
    await doc.save();
    updated += 1;
  }

  if (updated > 0) {
    console.log(`[server] Backfilled profileImage on ${updated} registration(s)`);
  }
}
