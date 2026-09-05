export const FRANCHISES = [
  { id: "arizona-avengers", name: "Arizona Avengers" },
  { id: "california-chargers", name: "California Chargers" },
  { id: "chicago-crushers", name: "Chicago Crushers" },
  { id: "florida-falcons", name: "Florida Falcons" },
  { id: "new-jersey-jaguars", name: "New Jersey Jaguars" },
  { id: "new-york-knights", name: "New York Knights" },
  { id: "texas-thunder", name: "Texas Thunder" },
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
  if (resolved === "chicago-crushers" || id === "carolina-crushers") {
    return "Chicago Crushers";
  }
  return FRANCHISES.find((f) => f.id === resolved)?.name || "";
}
