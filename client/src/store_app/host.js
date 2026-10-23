const STORE_HOSTS = new Set([
  "store.usclt20.com",
  "store.localhost",
]);

export function isStoreHostname() {
  if (typeof window === "undefined") return false;
  return STORE_HOSTS.has(window.location.hostname.toLowerCase());
}
