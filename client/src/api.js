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

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}
