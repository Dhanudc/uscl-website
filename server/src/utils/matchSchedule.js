/** @param {Array<{ status?: string, scheduledAt?: string | Date }>} matches */
export function pickUpcomingMatches(matches, limit = 2) {
  const upcoming = [...matches]
    .filter((m) => m.status === "upcoming" || m.status === "live")
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  return upcoming.slice(0, limit);
}

/** @param {Array<{ _id?: unknown, status?: string, scheduledAt?: string | Date }>} matches */
export function findNextMatchId(matches) {
  const next = [...matches]
    .filter((m) => m.status === "upcoming" || m.status === "live")
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))[0];
  return next?._id ? String(next._id) : null;
}
