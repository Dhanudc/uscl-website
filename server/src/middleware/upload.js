import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// upload.js lives in server/src/middleware → server package root is ../..
const serverRoot = path.join(__dirname, "../..");

const registrationRoot = path.join(serverRoot, "uploads", "registrations");
const profileImagesRoot = path.join(serverRoot, "public", "profile-images");
const paymentsRoot = path.join(serverRoot, "public", "payments");
const portalImagesRoot = path.join(serverRoot, "public", "media", "images");
const portalVideosRoot = path.join(serverRoot, "public", "media", "videos");
const socialRoot = path.join(serverRoot, "uploads", "social");

fs.mkdirSync(registrationRoot, { recursive: true });
fs.mkdirSync(profileImagesRoot, { recursive: true });
fs.mkdirSync(paymentsRoot, { recursive: true });
fs.mkdirSync(portalImagesRoot, { recursive: true });
fs.mkdirSync(portalVideosRoot, { recursive: true });
fs.mkdirSync(socialRoot, { recursive: true });

export const PROFILE_IMAGES_DIR = profileImagesRoot;
export const PAYMENTS_DIR = paymentsRoot;
export const PORTAL_IMAGES_DIR = portalImagesRoot;
export const PORTAL_VIDEOS_DIR = portalVideosRoot;

function makeStorage(dest) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`);
    },
  });
}

function namedImageFilename(req, file, cb) {
  const rawName = String(req.body.fullName || "player").trim() || "player";
  const person = rawName.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "player";
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
  const safeExt = ext && ext.length <= 8 ? ext : ".jpg";
  cb(null, `${person}_${hh}${mm}${ss}${safeExt}`);
}

/** Payment screenshots: Name_payment_HHmmss.ext */
function paymentNamedImageFilename(req, file, cb) {
  const rawName = String(req.body.fullName || "player").trim() || "player";
  const person = rawName.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "player";
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
  const safeExt = ext && ext.length <= 8 ? ext : ".jpg";
  cb(null, `${person}_payment_${hh}${mm}${ss}${safeExt}`);
}

function fileFilter(_req, file, cb) {
  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf", "image/svg+xml"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only JPG, PNG, WEBP, SVG, or PDF files are allowed."));
}

function imageFilter(_req, file, cb) {
  // Accept any image type (jpeg, png, webp, heic, gif, bmp, etc.)
  const mime = String(file.mimetype || "").toLowerCase();
  if (mime.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed."));
}

function videoFilter(_req, file, cb) {
  const mime = String(file.mimetype || "").toLowerCase();
  const allowed = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
  if (allowed.includes(mime)) cb(null, true);
  else cb(new Error("Only MP4, WEBM, MOV, or AVI videos are allowed."));
}

function portalMediaFilename(sectionId, file, cb) {
  const safeSection = String(sectionId || "media")
    .trim()
    .replace(/[^a-zA-Z0-9-]/g, "") || "media";
  const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
  const safeExt = ext.length <= 8 ? ext : ".jpg";
  cb(null, `${safeSection}_${Date.now()}${safeExt}`);
}

export const portalImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, portalImagesRoot),
    filename: (req, file, cb) => portalMediaFilename(req.body.sectionId, file, cb),
  }),
  fileFilter: imageFilter,
  limits: { fileSize: 15 * 1024 * 1024 },
}).single("file");

export const portalVideoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, portalVideosRoot),
    filename: (req, file, cb) => portalMediaFilename(req.body.sectionId, file, cb),
  }),
  fileFilter: videoFilter,
  limits: { fileSize: 200 * 1024 * 1024 },
}).single("file");

export const registrationUpload = multer({
  storage: makeStorage(registrationRoot),
  fileFilter,
  // No practical size cap for registration docs
}).fields([
  { name: "idProof", maxCount: 1 },
  { name: "companyId", maxCount: 1 },
]);

const registrationFieldsStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === "paymentScreenshot") cb(null, paymentsRoot);
    else cb(null, profileImagesRoot);
  },
  filename: (req, file, cb) => {
    if (file.fieldname === "paymentScreenshot") {
      return paymentNamedImageFilename(req, file, cb);
    }
    return namedImageFilename(req, file, cb);
  },
});

/** Player photo (required) + optional payment screenshot in one multipart request. */
export const playerRegistrationUpload = multer({
  storage: registrationFieldsStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 200 * 1024 * 1024,
    fieldSize: 200 * 1024 * 1024,
    files: 10,
  },
}).fields([
  { name: "photo", maxCount: 1 },
  { name: "paymentScreenshot", maxCount: 1 },
]);

export const playerPhotoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, profileImagesRoot),
    filename: namedImageFilename,
  }),
  fileFilter: imageFilter,
  limits: {
    fileSize: 200 * 1024 * 1024,
    fieldSize: 200 * 1024 * 1024,
  },
}).single("photo");

/** Optional payment screenshot only (dashboard / late payment details). */
export const paymentScreenshotUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, paymentsRoot),
    filename: paymentNamedImageFilename,
  }),
  fileFilter: imageFilter,
  limits: {
    fileSize: 200 * 1024 * 1024,
    fieldSize: 200 * 1024 * 1024,
  },
}).single("paymentScreenshot");

/** Profile picture only (dashboard late upload). */
export const profilePhotoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, profileImagesRoot),
    filename: namedImageFilename,
  }),
  fileFilter: imageFilter,
  limits: {
    fileSize: 200 * 1024 * 1024,
    fieldSize: 200 * 1024 * 1024,
  },
}).single("photo");

export const socialIconUpload = multer({
  storage: makeStorage(socialRoot),
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single("icon");

export function toFileMeta(file, folder = "registrations") {
  if (!file) return null;
  return {
    originalName: file.originalname,
    filename: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    url: `/uploads/${folder}/${file.filename}`,
  };
}

export function toProfileImageMeta(file) {
  if (!file) return null;
  return {
    originalName: file.originalname,
    filename: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    url: `/profile-images/${file.filename}`,
  };
}

/** Public URL for a filename stored in the profileImage DB column. */
export function profileImagePublicUrl(filename) {
  const name = String(filename || "").trim();
  if (!name) return "";
  const safe = path.basename(name.replace(/\\/g, "/"));
  if (!safe || safe === "." || safe === "..") return "";
  return `/profile-images/${safe}`;
}

export function paymentScreenshotPublicUrl(filename) {
  const name = String(filename || "").trim();
  if (!name) return "";
  const safe = path.basename(name.replace(/\\/g, "/"));
  if (!safe || safe === "." || safe === "..") return "";
  return `/payments/${safe}`;
}

/** Attach folder-based photo URL from profileImage column (keeps photo.url in sync for clients). */
export function withProfileImageUrl(doc) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  const filename = plain.profileImage || plain.photo?.filename || "";
  const url = profileImagePublicUrl(filename);
  if (url) {
    plain.profileImage = path.basename(filename);
    plain.profileImageUrl = url;
    plain.photo = {
      ...(plain.photo || {}),
      filename: plain.profileImage,
      url,
    };
  }
  if (plain.paymentScreenshot) {
    plain.paymentScreenshotUrl = paymentScreenshotPublicUrl(plain.paymentScreenshot);
  }
  if (!plain.paymentStatus) {
    const nested = String(plain.payment?.status || "pending").toLowerCase();
    plain.paymentStatus =
      nested === "paid" ? "paid" : nested === "failed" ? "failed" : nested === "cancelled" ? "cancelled" : "pending";
  }
  return plain;
}

export function mapWithProfileImageUrl(list) {
  return (list || []).map(withProfileImageUrl);
}

export function toSocialIconUrl(file) {
  if (!file) return "";
  return `/uploads/social/${file.filename}`;
}
