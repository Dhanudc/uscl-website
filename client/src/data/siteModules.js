/** Mirrors server site module keys for client nav / settings UI. */
export const SITE_MODULES = [
  { key: "about", label: "About", path: "/about", hint: "About USCL page and nav link" },
  { key: "teams", label: "Teams", path: "/franchises", hint: "Franchise teams page and nav link" },
  { key: "sponsors", label: "Sponsors", path: "/sponsorship", hint: "Sponsor packages (signed-in users)" },
  { key: "media", label: "Media", path: "/media", hint: "Gallery & videos page and Media button" },
  { key: "live", label: "Live", path: "/live", hint: "Live updates, fixtures, and points" },
  { key: "wesley", label: "Wesley", path: "/wesley", hint: "Wesley Elite Sports organizer page" },
  { key: "franchise", label: "Own A Team", path: "/franchise", hint: "Franchise ownership offer page" },
  { key: "register", label: "Register", path: "/register", hint: "Register / Registration button" },
  { key: "playerJourney", label: "Player Journey", path: "/player-journey", hint: "Player journey page and nav link" },
];

export const DEFAULT_MODULE_VISIBILITY = Object.fromEntries(
  SITE_MODULES.map((m) => [m.key, true])
);

export function normalizeModuleVisibility(input) {
  const src = input && typeof input === "object" ? input : {};
  const out = { ...DEFAULT_MODULE_VISIBILITY };
  for (const mod of SITE_MODULES) {
    if (typeof src[mod.key] === "boolean") {
      out[mod.key] = src[mod.key];
    }
  }
  return out;
}
