import { PLAYER_DOCUMENT_UPLOAD_SIZE_HINT } from "./utils/playerDocumentUploadBatches.js";

// Same-origin in production so Vercel rewrites proxy /api → Render.
// Calling Render directly breaks the session cookie (third-party blocked).
const API_BASE = String(import.meta.env.VITE_API_URL || "")
  .trim()
  .replace(/\/$/, "");

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isForm && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    headers["X-USCL-Portal"] = "admin";
  }

  const { portal, ...fetchOptions } = options;
  if (portal) headers["X-USCL-Portal"] = portal;

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...fetchOptions,
    headers,
  });

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
    const fallback =
      data.error ||
      rawSnippet ||
      res.statusText ||
      `HTTP ${res.status}`;
    if (res.status === 404) {
      throw new Error(
        data.error ||
          "API route not found. Restart the server (npm run dev) so new admin routes are loaded."
      );
    }
    throw new Error(fallback);
  }
  return data;
}

/** Download a binary/text file from an API path (e.g. CSV export). */
export async function apiDownload(path, { filename } = {}) {
  const headers = {};
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    headers["X-USCL-Portal"] = "admin";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Download failed");
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const finalName = filename || match?.[1] || "download.csv";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
