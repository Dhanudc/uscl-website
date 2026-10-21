export const FRANCHISES = [
  { id: "arizona-avengers", name: "Arizona Avengers" },
  { id: "california-chargers", name: "California Chargers" },
  { id: "chicago-crushers", name: "Chicago Centurions" },
  { id: "florida-falcons", name: "Florida Falcons" },
  { id: "new-jersey-jaguars", name: "New Jersey Jaguars" },
  { id: "new-york-knights", name: "Ceipal New York Knights" },
  { id: "texas-thunder", name: "Texas Thunders" },
  { id: "virginia-vikings", name: "Virginia Vikings" },
];

/** Legacy id kept for existing registrations assigned before the rename. */
const FRANCHISE_ALIASES = {
  "carolina-crushers": "chicago-crushers",
};

export function resolveFranchiseId(id) {
  const key = String(id || "").trim();
  return FRANCHISE_ALIASES[key] || key;
}

export function getFranchiseName(id) {
  const resolved = resolveFranchiseId(id);
  return FRANCHISES.find((f) => f.id === resolved)?.name || "";
}

/** Franchise ids to match in DB when filtering reports (includes legacy aliases). */
export function expandFranchiseIdsForQuery(ids) {
  const out = new Set();
  for (const raw of ids || []) {
    const id = String(raw || "").trim().toLowerCase();
    if (!id || id === "none") continue;
    out.add(id);
    if (id === "chicago-crushers") out.add("carolina-crushers");
  }
  return [...out];
}

export const REPORT_TEAM_FILTER_IDS = ["none", ...FRANCHISES.map((f) => f.id)];
