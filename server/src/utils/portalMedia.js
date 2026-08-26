import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  MAX_IMAGES_PER_SECTION,
  MAX_VIDEOS_PER_SECTION,
  PORTAL_IMAGE_SECTIONS,
  PORTAL_VIDEO_SECTIONS,
} from "../constants/portalMedia.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.join(__dirname, "../..");

export const PORTAL_IMAGES_DIR = path.join(serverRoot, "public", "media", "images");
export const PORTAL_VIDEOS_DIR = path.join(serverRoot, "public", "media", "videos");

export function portalImagePublicUrl(filename) {
  const name = path.basename(String(filename || "").replace(/\\/g, "/"));
  if (!name || name === "." || name === "..") return "";
  return `/media/images/${name}`;
}

export function portalVideoPublicUrl(filename) {
  const name = path.basename(String(filename || "").replace(/\\/g, "/"));
  if (!name || name === "." || name === "..") return "";
  return `/media/videos/${name}`;
}

function withItemUrls(item, type) {
  if (!item) return null;
  const url =
    type === "video" ? portalVideoPublicUrl(item.filename) : portalImagePublicUrl(item.filename);
  return {
    id: item.id,
    sectionId: item.sectionId,
    title: item.title || "",
    caption: item.caption || "",
    filename: item.filename,
    url,
  };
}

/** Group flat portalMedia arrays into section payloads for the public site. */
export function buildPortalMediaResponse(portalMedia = {}) {
  const images = Array.isArray(portalMedia.images) ? portalMedia.images : [];
  const videos = Array.isArray(portalMedia.videos) ? portalMedia.videos : [];

  return {
    gallery: PORTAL_IMAGE_SECTIONS.map((section) => ({
      ...section,
      images: images
        .filter((item) => item.sectionId === section.id)
        .map((item) => withItemUrls(item, "image")),
    })),
    videos: PORTAL_VIDEO_SECTIONS.map((section) => {
      const video = videos.find((item) => item.sectionId === section.id);
      return {
        ...section,
        video: video ? withItemUrls(video, "video") : null,
      };
    }),
    limits: {
      maxImagesPerSection: MAX_IMAGES_PER_SECTION,
      maxVideosPerSection: MAX_VIDEOS_PER_SECTION,
    },
  };
}

export function countSectionImages(portalMedia, sectionId) {
  return (portalMedia?.images || []).filter((item) => item.sectionId === sectionId).length;
}

export function findPortalImageItem(portalMedia, itemId) {
  return (portalMedia?.images || []).find((item) => item.id === itemId) || null;
}

export function findPortalVideoItem(portalMedia, itemId) {
  return (portalMedia?.videos || []).find((item) => item.id === itemId) || null;
}

export function findPortalVideoBySection(portalMedia, sectionId) {
  return (portalMedia?.videos || []).find((item) => item.sectionId === sectionId) || null;
}

export function newPortalMediaItemId() {
  return `pm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function deletePortalMediaFile(filename, type) {
  const name = path.basename(String(filename || "").replace(/\\/g, "/"));
  if (!name || name === "." || name === "..") return;
  const dir = type === "video" ? PORTAL_VIDEOS_DIR : PORTAL_IMAGES_DIR;
  try {
    await fs.unlink(path.join(dir, name));
  } catch {
    // file may already be gone
  }
}
