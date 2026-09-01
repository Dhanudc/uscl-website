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

/**
 * Resize/compress an image file so uploads stay under proxy limits (~4.5 MB on Vercel).
 * Returns the original file when compression fails or the file is already small enough.
 */
export async function compressImageForUpload(file, { maxBytes = 1.5 * 1024 * 1024, maxDim = 1600 } = {}) {
  if (!file || !file.type?.startsWith("image/")) return file;
  if (file.size <= maxBytes) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
  let quality = 0.88;
  let blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
  while (blob && blob.size > maxBytes && quality > 0.45) {
    quality -= 0.1;
    blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
  }
  if (!blob || blob.size >= file.size) return file;

  const base = file.name.replace(/\.[^.]+$/, "") || "upload";
  const ext = mime === "image/png" ? ".png" : ".jpg";
  return new File([blob], `${base}${ext}`, { type: mime, lastModified: Date.now() });
}
