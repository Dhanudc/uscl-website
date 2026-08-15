export const FRANCHISES = [
  { id: "arizona-avengers", name: "Arizona Avengers" },
  { id: "california-chargers", name: "California Chargers" },
  { id: "carolina-crushers", name: "Carolina Crushers" },
  { id: "florida-falcons", name: "Florida Falcons" },
  { id: "new-jersey-jaguars", name: "New Jersey Jaguars" },
  { id: "new-york-knights", name: "New York Knights" },
  { id: "texas-thunder", name: "Texas Thunder" },
  { id: "virginia-vikings", name: "Virginia Vikings" },
];

export function getFranchiseName(id) {
  return FRANCHISES.find((f) => f.id === id)?.name || "";
}
