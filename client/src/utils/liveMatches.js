const ET = "America/New_York";

function etDateKey(scheduledAt) {
  return new Date(scheduledAt).toLocaleDateString("en-CA", { timeZone: ET });
}

export function sortMatchesByDate(matches) {
  return [...matches].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
}

export function pickUpcomingMatches(matches, limit = 2) {
  return sortMatchesByDate(matches)
    .filter((m) => m.status === "upcoming" || m.status === "live")
    .slice(0, limit);
}

export function findNextMatch(schedule) {
  const sorted = sortMatchesByDate(schedule);
  const flagged = sorted.find((m) => m.status === "upcoming" || m.status === "live");
  if (flagged) return flagged;
  return (
    sorted.find((m) => m.status !== "completed" && m.status !== "cancelled") || null
  );
}

export function findNextMatchId(schedule) {
  const next = findNextMatch(schedule);
  if (!next) return null;
  return next._id ? String(next._id) : next.matchNumber ? `static-${next.matchNumber}` : null;
}

export function groupMatchesByDay(schedule) {
  const sorted = sortMatchesByDate(schedule);
  const groups = [];
  let current = null;

  for (const match of sorted) {
    const key = etDateKey(match.scheduledAt);
    if (!current || current.key !== key) {
      const sample = new Date(match.scheduledAt);
      current = {
        key,
        monthYear: sample.toLocaleDateString("en-US", { timeZone: ET, month: "long", year: "numeric" }),
        dayLabel: sample.toLocaleDateString("en-US", {
          timeZone: ET,
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        monthAbbr: sample.toLocaleDateString("en-US", { timeZone: ET, month: "short" }).toUpperCase(),
        dayNum: sample.toLocaleDateString("en-US", { timeZone: ET, day: "numeric" }),
        matches: [],
      };
      groups.push(current);
    }
    current.matches.push(match);
  }

  return groups;
}

export function matchSessionLabel(scheduledAt) {
  const d = new Date(scheduledAt);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  if (hour === 9 && minute === 0) return "Morning · 9:00 AM ET";
  if (hour === 12 && minute === 30) return "Afternoon · 12:30 PM ET";
  return d.toLocaleTimeString("en-US", {
    timeZone: ET,
    hour: "numeric",
    minute: "2-digit",
  }) + " ET";
}

export function matchDateTimeLabel(scheduledAt) {
  const d = new Date(scheduledAt);
  return d.toLocaleDateString("en-US", {
    timeZone: ET,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function matchIsLive(match) {
  return match.status === "live";
}

export function matchIsPast(match) {
  return match.status === "completed" || match.status === "cancelled";
}

export function matchHasResult(match) {
  return Boolean(match.teamAScore || match.teamBScore || match.resultSummary);
}
