const DEFAULT_STORE_URL = "https://store.usclt20.com";
const DEFAULT_MAIN_SITE_URL = "https://www.usclt20.com";

/** League home (store header “Main site”). */
export function mainSiteHomeUrl() {
  const fromEnv = String(import.meta.env.VITE_MAIN_SITE_URL || "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV && typeof window !== "undefined") {
    return `${window.location.origin}/home`;
  }
  return DEFAULT_MAIN_SITE_URL;
}

/** Public store URL for nav links (main site → store subdomain). */
export function storeHomeUrl() {
  const fromEnv = String(import.meta.env.VITE_STORE_URL || "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV && typeof window !== "undefined") {
    return `${window.location.origin}/store`;
  }
  return DEFAULT_STORE_URL;
}
