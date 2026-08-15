import { FRANCHISES } from "./franchises.js";

export function buildPointsTable(matches) {
  const table = Object.fromEntries(
    FRANCHISES.map((f) => [
      f.id,
      {
        id: f.id,
        name: f.name,
        played: 0,
        won: 0,
        lost: 0,
        noResult: 0,
        points: 0,
      },
    ])
  );

  for (const match of matches) {
    if (match.status !== "completed") continue;
    const a = table[match.teamAId];
    const b = table[match.teamBId];
    if (!a || !b) continue;

    a.played += 1;
    b.played += 1;

    if (match.winnerId && table[match.winnerId]) {
      if (match.winnerId === a.id) {
        a.won += 1;
        a.points += 2;
        b.lost += 1;
      } else if (match.winnerId === b.id) {
        b.won += 1;
        b.points += 2;
        a.lost += 1;
      }
    } else {
      a.noResult += 1;
      b.noResult += 1;
      a.points += 1;
      b.points += 1;
    }
  }

  return Object.values(table).sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.won !== x.won) return y.won - x.won;
    return x.name.localeCompare(y.name);
  });
}
