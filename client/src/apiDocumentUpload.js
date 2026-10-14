import { api } from "./api.js";
import { PLAYER_DOCUMENT_UPLOAD_SIZE_HINT } from "./utils/playerDocumentUpload.js";

const API_BASE = String(import.meta.env.VITE_API_URL || "")
  .trim()
  .replace(/\/$/, "");

const DIRECT_API_FALLBACK = String(
  import.meta.env.VITE_API_DIRECT_URL || "https://uscl-website.onrender.com"
)
  .trim()
  .replace(/\/$/, "");

function isLocalDevHost() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

async function parseUploadResponse(res) {
  const raw = await res.text();
  let data = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = {};
    }
  }
  if (!res.ok) {
    if (res.status === 413) {
      throw new Error(PLAYER_DOCUMENT_UPLOAD_SIZE_HINT);
    }
    const rawSnippet =
      raw && !raw.startsWith("{")
        ? raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200)
        : "";
    throw new Error(data.error || rawSnippet || res.statusText || `HTTP ${res.status}`);
  }
  return data;
}

/**
 * Upload player documents (multipart). Uses a short-lived token + direct API URL in production
 * so large files bypass the Vercel /api body limit.
 */
export async function apiDocumentUpload(uploadPath, formData, { tokenPath }) {
  if (isLocalDevHost()) {
    return api(uploadPath, { method: "POST", body: formData });
  }

  const session = await api(tokenPath, { method: "POST" });
  const directApiBase = String(session.directApiBase || DIRECT_API_FALLBACK).replace(/\/$/, "");
  const token = String(session.token || "").trim();
  if (!token) {
    return api(uploadPath, { method: "POST", body: formData });
  }

  const headers = { Authorization: `Bearer ${token}` };
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    headers["X-USCL-Portal"] = "admin";
  }

  const res = await fetch(`${directApiBase}${uploadPath}`, {
    method: "POST",
    body: formData,
    headers,
  });
  return parseUploadResponse(res);
}
