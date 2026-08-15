/** Unique playing-role values stored on player registrations. */
export const PLAYER_ROLES = [
  { value: "batsman", label: "Batsman" },
  { value: "batting_all_rounder", label: "Batting all-rounder" },
  { value: "wicketkeeper_batter", label: "Wicketkeeper-batter" },
  { value: "bowling_all_rounder", label: "Bowling all-rounder" },
  { value: "fast_bowler", label: "Fast bowler" },
  { value: "spin_bowler", label: "Spin bowler" },
];

const LABEL_BY_VALUE = Object.fromEntries(PLAYER_ROLES.map((r) => [r.value, r.label]));

export function playerRoleLabel(value) {
  const key = String(value || "").trim();
  if (!key) return "";
  return LABEL_BY_VALUE[key] || key;
}
