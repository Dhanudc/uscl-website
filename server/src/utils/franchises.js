export const FRANCHISES = [
  { id: "arizona-avengers", name: "Arizona Avengers" },
  { id: "california-chargers", name: "California Chargers" },
  { id: "chicago-crushers", name: "Chicago Centurions" },
  { id: "florida-falcons", name: "Florida Falcons" },
  { id: "virginia-vikings", name: "Virginia Vikings" },
  { id: "new-york-knights", name: "Ceipal New York Knights" },
  { id: "texas-thunder", name: "Texas Thunders" },
  { id: "norwin-atlanta-lions", name: "Norwin Atlanta Lions" },
];

/** Legacy id kept for existing registrations assigned before the rename. */
const FRANCHISE_ALIASES = {
  "carolina-crushers": "chicago-crushers",
  "new-jersey-jaguars": "norwin-atlanta-lions",
  "atlanta-lions": "norwin-atlanta-lions",
};

export function resolveFranchiseId(id) {
  const key = String(id || "").trim();
  return FRANCHISE_ALIASES[key] || key;
}

export function getFranchiseName(id) {
  const resolved = resolveFranchiseId(id);
  return FRANCHISES.find((f) => f.id === resolved)?.name || "";
}

const LEGACY_FRANCHISE_NAME = /^new\s*jersey\s*jaguars$/i;

/** Canonical id + display name for API responses (fixes stale DB strings). */
export function normalizeFranchiseFields(input = {}) {
  const franchiseId = resolveFranchiseId(input.franchiseId);
  const fromId = getFranchiseName(franchiseId);
  let franchiseName = String(input.franchiseName || "").trim();
  if (fromId) {
    franchiseName = fromId;
  } else if (LEGACY_FRANCHISE_NAME.test(franchiseName)) {
    franchiseName = "Norwin Atlanta Lions";
  }
  return { franchiseId, franchiseName };
}

export function withNormalizedFranchise(row) {
  if (!row || typeof row !== "object") return row;
  const { franchiseId, franchiseName } = normalizeFranchiseFields(row);
  return { ...row, franchiseId, franchiseName };
}

/** Franchise ids to match in DB when filtering reports (includes legacy aliases). */
export function expandFranchiseIdsForQuery(ids) {
  const out = new Set();
  for (const raw of ids || []) {
    const id = String(raw || "").trim().toLowerCase();
    if (!id || id === "none") continue;
    out.add(id);
    if (id === "chicago-crushers") out.add("carolina-crushers");
    if (id === "norwin-atlanta-lions") {
      out.add("new-jersey-jaguars");
      out.add("atlanta-lions");
    }
  }
  return [...out];
}

export const REPORT_TEAM_FILTER_IDS = ["none", ...FRANCHISES.map((f) => f.id)];
