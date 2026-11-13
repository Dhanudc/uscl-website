import { isStoreHostname } from "./host";

const DEFAULT_STORE_URL = "https://store.usclt20.com";
const DEFAULT_MAIN_SITE_URL = "https://www.usclt20.com";

function devClientPort() {
  if (typeof window === "undefined") return "5175";
  return window.location.port || "5175";
}

/** League home (store header “Main site”). */
export function mainSiteHomeUrl() {
  const fromEnv = String(import.meta.env.VITE_MAIN_SITE_URL || "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV && typeof window !== "undefined") {
    if (isStoreHostname()) {
      return `http://localhost:${devClientPort()}/home`;
    }
    return `${window.location.origin}/home`;
  }
  return DEFAULT_MAIN_SITE_URL;
}

/** Public store URL for nav links (main site → store subdomain). */
export function storeHomeUrl() {
  const fromEnv = String(import.meta.env.VITE_STORE_URL || "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV && typeof window !== "undefined") {
    if (isStoreHostname()) {
      return window.location.origin;
    }
    return `http://store.localhost:${devClientPort()}`;
  }
  return DEFAULT_STORE_URL;
}

/** In-app path: '' on store subdomain, '/store' on main site. */
export function storeBasePath() {
  if (typeof window === "undefined") return "";
  return isStoreHostname() ? "" : "/store";
}

export function storePath(sub = "") {
  const base = storeBasePath();
  const tail = String(sub || "").trim();
  if (!tail || tail === "/") return base || "/";
  const path = tail.startsWith("/") ? tail : `/${tail}`;
  return `${base}${path}` || "/";
}

/** Redirect target for unknown store paths (works on store host and /store on main site). */
export function storeRootPath() {
  return storePath("/");
}
