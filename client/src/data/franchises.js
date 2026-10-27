const FRANCHISE_ID_ALIASES = {
  "new-jersey-jaguars": "norwin-atlanta-lions",
  "atlanta-lions": "norwin-atlanta-lions",
};

export function resolveFranchiseId(id) {
  const key = String(id || "").trim();
  return FRANCHISE_ID_ALIASES[key] || key;
}

export function findFranchise(id) {
  const resolved = resolveFranchiseId(id);
  return franchises.find((f) => f.id === resolved) || null;
}

export function displayFranchiseName(reg) {
  const team = findFranchise(reg?.franchiseId);
  if (team) return team.name;
  const stored = String(reg?.franchiseName || "").trim();
  if (/^new\s*jersey\s*jaguars$/i.test(stored)) return "Norwin Atlanta Lions";
  return stored;
}

/** State or city label for pennants, ribbons, and compact UI (e.g. Atlanta, Texas). */
export function franchiseLocationLabel(teamOrId) {
  const team =
    typeof teamOrId === "string" ? findFranchise(teamOrId) : teamOrId;
  if (!team) return "";
  return String(team.city || team.shortName || "").trim();
}

export const franchises = [
  { id: "arizona-avengers", name: "Arizona Avengers", shortName: "Avengers", city: "Arizona", image: "/franchises/arizona-avengers.png", accent: "#7a1f2b" },
  { id: "california-chargers", name: "California Chargers", shortName: "Chargers", city: "California", image: "/franchises/california-chargers.png", accent: "#d4a017" },
  { id: "chicago-crushers", name: "Chicago Centurions", shortName: "Centurions", city: "Chicago", image: "/franchises/chicago-crushers.jpg", accent: "#4aa3d9" },
  { id: "florida-falcons", name: "Florida Falcons", shortName: "Falcons", city: "Florida", image: "/franchises/florida-falcons.png", accent: "#e85d04" },
  { id: "virginia-vikings", name: "Virginia Vikings", shortName: "Vikings", city: "Virginia", image: "/franchises/virginia-vikings.png", accent: "#16325c" },
  {
    id: "new-york-knights",
    name: "Ceipal New York Knights",
    shortName: "Knights",
    city: "New York",
    image: "/franchises/new-york-knights.png",
    accent: "#e85d04",
  },
  { id: "texas-thunder", name: "Texas Thunders", shortName: "Thunders", city: "Texas", image: "/franchises/texas-thunder.png", accent: "#1e4fd6" },
  {
    id: "norwin-atlanta-lions",
    name: "Norwin Atlanta Lions",
    shortName: "Lions",
    city: "Atlanta",
    image: "/franchises/norwin-atlanta-lions.png",
    imageSm: "/franchises/norwin-atlanta-lions-sm.png",
    accent: "#e5b820",
    accentSecondary: "#1e4fd6",
  },
];
