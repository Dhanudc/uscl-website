const API_BASE = String(import.meta.env.VITE_API_URL || "")
  .trim()
  .replace(/\/$/, "");

/** Build absolute media URL for uploads / profile images. */
export function mediaUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return API_BASE ? `${API_BASE}${path}` : path;
}

/**
 * Resolve player profile image from DB column `profileImage` (filename in
 * /profile-images folder), with fallback to legacy photo.url.
 */
export function profileImageUrl(reg) {
  if (!reg) return "";
  if (reg.profileImageUrl) return mediaUrl(reg.profileImageUrl);
  const filename = String(reg.profileImage || reg.photo?.filename || "").trim();
  if (filename) return mediaUrl(`/profile-images/${filename.split("/").pop()}`);
  const legacy = String(reg.photo?.url || "").trim();
  // Only use legacy URL if it already points at profile-images
  if (legacy.includes("/profile-images/")) return mediaUrl(legacy);
  return "";
}

/** Payment screenshot from DB column `paymentScreenshot` in /payments. */
export function paymentScreenshotUrl(reg) {
  if (!reg) return "";
  if (reg.paymentScreenshotUrl) return mediaUrl(reg.paymentScreenshotUrl);
  const filename = String(reg.paymentScreenshot || "").trim();
  if (!filename) return "";
  return mediaUrl(`/payments/${filename.split("/").pop()}`);
}

/** Portal gallery image from /media/images. */
export function portalMediaImageUrl(item) {
  if (!item) return "";
  if (item.url) return mediaUrl(item.url);
  const filename = String(item.filename || "").trim();
  if (!filename) return "";
  return mediaUrl(`/media/images/${filename.split("/").pop()}`);
}

/** Portal video from /media/videos. */
export function portalMediaVideoUrl(item) {
  if (!item) return "";
  if (item.url) return mediaUrl(item.url);
  const filename = String(item.filename || "").trim();
  if (!filename) return "";
  return mediaUrl(`/media/videos/${filename.split("/").pop()}`);
}
