import fs from "fs/promises";
import path from "path";
import { MediaFile } from "../models/MediaFile.js";

function safeName(filename) {
  return path.basename(String(filename || "").replace(/\\/g, "/"));
}

/** Persist a multer disk file into Mongo so Render redeploys do not wipe images. */
export async function persistUploadedFile(file, kind = "other") {
  if (!file?.filename || !file?.path) return null;
  const filename = safeName(file.filename);
  if (!filename || filename === "." || filename === "..") return null;

  const data = await fs.readFile(file.path);
  await MediaFile.findOneAndUpdate(
    { filename },
    {
      filename,
      mimeType: file.mimetype || "application/octet-stream",
      size: data.length,
      kind,
      data,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return filename;
}

export async function persistUploadedFiles(files, kind = "other") {
  const list = (Array.isArray(files) ? files : [files]).filter(Boolean);
  for (const file of list) {
    await persistUploadedFile(file, kind);
  }
}

/** Express handler: serve image from Mongo, else next() for disk static. */
export function serveMediaFromDb(kind) {
  return async (req, res, next) => {
    try {
      const filename = safeName(req.params.filename);
      if (!filename) return next();

      const filter = { filename };
      if (kind) filter.kind = kind;

      let doc = await MediaFile.findOne(filter).select("mimeType data");
      // Fallback if kind was stored differently
      if (!doc && kind) {
        doc = await MediaFile.findOne({ filename }).select("mimeType data");
      }
      if (!doc?.data?.length) return next();

      res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(doc.data);
    } catch (err) {
      console.error("serveMediaFromDb error", err);
      return next();
    }
  };
}
