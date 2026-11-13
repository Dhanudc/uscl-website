import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const STOREDATA_ROOT = path.join(__dirname, "../../../public/storedata");

export function ensureStoredataDir(subpath = "") {
  const dir = path.join(STOREDATA_ROOT, subpath);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function clearProductImageFolder(productId, slug) {
  const folder = path.join(STOREDATA_ROOT, "products", `${productId}-${slug}`);
  if (fs.existsSync(folder)) fs.rmSync(folder, { recursive: true, force: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024, files: 8 },
  fileFilter(_req, file, cb) {
    const ok = /^image\/(jpeg|png|webp)$/i.test(file.mimetype);
    cb(ok ? null : new Error("Only JPG, PNG and WebP images are allowed."), ok);
  },
});

const MAX_PRODUCT_IMAGES = 12;

export const storeProductImagesUpload = upload.array("images", 8);

export async function saveProductImageFiles(productId, slug, buffers) {
  const folder = ensureStoredataDir(path.join("products", `${productId}-${slug}`));
  const saved = [];
  for (let i = 0; i < buffers.length; i++) {
    const ext = buffers[i].ext || "jpg";
    const base = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${i}`;
    const relDir = path.join("products", `${productId}-${slug}`);
    const fileName = `${base}.${ext}`;
    const abs = path.join(folder, fileName);
    fs.writeFileSync(abs, buffers[i].buffer);
    const rel = `/storedata/${relDir.replace(/\\/g, "/")}/${fileName}`;
    saved.push({
      thumb: rel,
      card: rel,
      main: rel,
      large: rel,
    });
  }
  return saved;
}

export function extFromMime(mime) {
  if (/png/i.test(mime)) return "png";
  if (/webp/i.test(mime)) return "webp";
  return "jpg";
}

export { MAX_PRODUCT_IMAGES };
