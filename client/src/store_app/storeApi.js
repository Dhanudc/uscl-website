import { isStoreHostname } from "./host";
import { apiUnreachableMessage, fetchWithTimeout } from "../utils/fetchWithTimeout.js";

const API_BASE = String(import.meta.env.VITE_API_URL || "")
  .trim()
  .replace(/\/$/, "");

function isStoreAdminArea() {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  if (isStoreHostname()) return path.startsWith("/admin");
  return path.startsWith("/store/admin");
}

export async function storeApi(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isForm && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  if (isStoreAdminArea()) {
    headers["X-USCL-Portal"] = "admin";
  }

  let res;
  try {
    res = await fetchWithTimeout(`${API_BASE}${path}`, {
      credentials: "include",
      ...options,
      headers,
    });
  } catch (err) {
    throw new Error(err.message || apiUnreachableMessage(API_BASE));
  }

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
    const rawSnippet =
      raw && !raw.startsWith("{")
        ? raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200)
        : "";
    let fallback =
      data.error ||
      rawSnippet ||
      res.statusText ||
      `HTTP ${res.status}`;
    if (
      res.status >= 500 &&
      (/internal server error/i.test(fallback) || !data.error) &&
      !API_BASE
    ) {
      fallback = apiUnreachableMessage(API_BASE);
    }
    throw new Error(fallback);
  }
  return data;
}

export function formatInr(paise) {
  const n = Number(paise) || 0;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n / 100);
}

/** Product/cart images live on the API at /storedata (proxy in dev, VITE_API_URL in prod). */
export function storeMediaUrl(src) {
  if (!src) return "";
  if (/^https?:\/\//i.test(src)) return src;
  const path = String(src).startsWith("/") ? src : `/${src}`;
  return API_BASE ? `${API_BASE}${path}` : path;
}
