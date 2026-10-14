import { api } from "./api.js";
import { PLAYER_DOCUMENT_UPLOAD_SIZE_HINT } from "./utils/playerDocumentUpload.js";

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

function resolveDirectApiBase(raw) {
  const base = String(raw || "").trim().replace(/\/$/, "");
  if (!base || /localhost|127\.0\.0\.1/i.test(base)) {
    return DIRECT_API_FALLBACK;
  }
  return base;
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

/** Fetch once per save; reuse for multiple file uploads in the same session. */
export async function fetchDocumentUploadSession(tokenPath) {
  if (isLocalDevHost()) return null;
  const session = await api(tokenPath, { method: "POST" });
  return {
    ...session,
    directApiBase: resolveDirectApiBase(session?.directApiBase),
  };
}

async function postViaSameOrigin(uploadPath, formData) {
  return api(uploadPath, { method: "POST", body: formData });
}

async function postViaDirectApi(uploadPath, formData, session) {
  const directApiBase = resolveDirectApiBase(session?.directApiBase);
  const token = String(session?.token || "").trim();
  if (!token) {
    return postViaSameOrigin(uploadPath, formData);
  }

  const headers = { Authorization: `Bearer ${token}` };
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    headers["X-USCL-Portal"] = "admin";
  }

  let res;
  try {
    res = await fetch(`${directApiBase}${uploadPath}`, {
      method: "POST",
      body: formData,
      headers,
    });
  } catch {
    throw new Error("DIRECT_UPLOAD_NETWORK_ERROR");
  }
  return parseUploadResponse(res);
}

async function postDocumentUpload(uploadPath, formData, session) {
  if (isLocalDevHost()) {
    return postViaSameOrigin(uploadPath, formData);
  }

  try {
    return await postViaDirectApi(uploadPath, formData, session);
  } catch (err) {
    if (err?.message === "DIRECT_UPLOAD_NETWORK_ERROR") {
      try {
        return await postViaSameOrigin(uploadPath, formData);
      } catch (fallbackErr) {
        throw new Error(
          "Upload could not reach the server. Check your internet connection and try again. " +
            PLAYER_DOCUMENT_UPLOAD_SIZE_HINT
        );
      }
    }
    throw err;
  }
}

/**
 * Upload player documents (multipart). Uses a short-lived token + direct API URL in production
 * so large files bypass the Vercel /api body limit.
 */
export async function apiDocumentUpload(uploadPath, formData, { tokenPath, session }) {
  const activeSession = session ?? (await fetchDocumentUploadSession(tokenPath));
  return postDocumentUpload(uploadPath, formData, activeSession);
}
