/** Order squad list: captain, vice captain, then everyone else (by name). */
export function sortPlayersBySquadRole(players) {
  const rank = (p) => {
    const r = String(p?.squadRole || "").toLowerCase();
    if (r === "captain") return 0;
    if (r === "vice_captain") return 1;
    return 2;
  };
  return [...(players || [])].sort((a, b) => {
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return String(a?.fullName || "").localeCompare(String(b?.fullName || ""), undefined, {
      sensitivity: "base",
    });
  });
}
