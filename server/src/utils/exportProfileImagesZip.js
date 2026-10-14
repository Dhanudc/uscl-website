import fs from "fs/promises";
import path from "path";
import archiver from "archiver";
import { MediaFile } from "../models/MediaFile.js";
import { PROFILE_IMAGES_DIR } from "../middleware/upload.js";

export function sanitizeProfileExportBasename(fullName) {
  return (
    String(fullName || "Player")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .replace(/_+/g, "_")
      .slice(0, 80) || "Player"
  );
}

export function profileExportZipEntryName(playerCode, fullName, ext) {
  const code = String(playerCode || "UNKNOWN").trim().replace(/\s+/g, "");
  const name = sanitizeProfileExportBasename(fullName);
  const dotExt = String(ext || ".jpg").startsWith(".") ? ext : `.${ext}`;
  return `${code}_${name}${dotExt}`;
}

function extFromMime(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("png")) return ".png";
  if (m.includes("webp")) return ".webp";
  if (m.includes("gif")) return ".gif";
  if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";
  return ".jpg";
}

function extFromFilename(filename) {
  const ext = path.extname(String(filename || ""));
  if (ext && ext.length <= 6) return ext.toLowerCase();
  return ".jpg";
}

async function readProfileImageBuffer(filename) {
  const safe = path.basename(String(filename || "").replace(/\\/g, "/"));
  if (!safe || safe === "." || safe === "..") return null;

  let doc = await MediaFile.findOne({ filename: safe, kind: "profile" }).select("data mimeType");
  if (!doc) {
    doc = await MediaFile.findOne({ filename: safe }).select("data mimeType");
  }
  if (doc?.data?.length) {
    const ext = extFromFilename(safe) === ".jpg" ? extFromMime(doc.mimeType) : extFromFilename(safe);
    return { buffer: doc.data, ext };
  }

  const diskPath = path.join(PROFILE_IMAGES_DIR, safe);
  try {
    const buffer = await fs.readFile(diskPath);
    return { buffer, ext: extFromFilename(safe) };
  } catch {
    return null;
  }
}

/** Entry names: USCL-00042_Koushik_Reddy.jpg */
export async function appendProfileImagesToArchive(archive, registrations) {
  const usedNames = new Map();
  let added = 0;
  let skipped = 0;

  for (const reg of registrations) {
    const stored = String(reg.profileImage || reg.photo?.filename || "").trim();
    if (!stored) {
      skipped += 1;
      continue;
    }

    const file = await readProfileImageBuffer(stored);
    if (!file?.buffer?.length) {
      skipped += 1;
      continue;
    }

    let zipName = profileExportZipEntryName(reg.playerCode, reg.fullName, file.ext);
    const seen = (usedNames.get(zipName) || 0) + 1;
    usedNames.set(zipName, seen);
    if (seen > 1) {
      const base = zipName.replace(/\.[^.]+$/i, "");
      zipName = `${base}_${seen}${file.ext}`;
    }

    archive.append(file.buffer, { name: zipName });
    added += 1;
  }

  return { added, skipped };
}

export function createProfileImagesZipStream(res) {
  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.on("error", (err) => {
    console.error("profile images zip error", err);
    if (!res.headersSent) {
      res.status(500).end();
    }
  });
  archive.pipe(res);
  return archive;
}
