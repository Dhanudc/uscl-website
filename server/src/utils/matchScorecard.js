/** Server-side scorecard normalization (matches client/src/utils/matchScorecard.js). */

export function parseMatchScorecard(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return normalizeScorecard(raw);
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    return normalizeScorecard(JSON.parse(raw));
  } catch {
    return null;
  }
}

function normalizeScorecard(input) {
  if (!input || typeof input !== "object") return null;
  const batting = (Array.isArray(input.batting) ? input.batting : [])
    .map(normalizeBatter)
    .filter((row) => row.name);
  const bowling = (Array.isArray(input.bowling) ? input.bowling : [])
    .map(normalizeBowler)
    .filter((row) => row.name);
  const fallOfWickets = (Array.isArray(input.fallOfWickets)
    ? input.fallOfWickets
    : Array.isArray(input.fall_of_wickets)
      ? input.fall_of_wickets
      : []
  ).map(normalizeFow);
  const toBat = (Array.isArray(input.toBat)
    ? input.toBat
    : Array.isArray(input.to_bat)
      ? input.to_bat
      : []
  ).map((n) => String(n).trim()).filter(Boolean);

  if (
    !batting.length &&
    !bowling.length &&
    !fallOfWickets.length &&
    !input.inningsSummary &&
    !input.innings_summary
  ) {
    return null;
  }

  return {
    inningsSummary: String(input.inningsSummary || input.innings_summary || "").trim(),
    batting,
    bowling,
    extras: normalizeExtras(input.extras),
    total: normalizeTotal(input.total),
    toBat,
    fallOfWickets,
  };
}

function normalizeBatter(row) {
  return {
    name: String(row.name || row.batter || "").trim(),
    dismissal: String(row.dismissal || row.out || row.howOut || "").trim(),
    runs: row.runs ?? row.r ?? "",
    balls: row.balls ?? row.b ?? "",
    fours: row.fours ?? row["4s"] ?? "",
    sixes: row.sixes ?? row["6s"] ?? "",
    strikeRate: row.strikeRate ?? row.sr ?? row.SR ?? "",
    minutes: row.minutes ?? row.min ?? row.Min ?? "",
  };
}

function normalizeBowler(row) {
  return {
    name: String(row.name || row.bowler || "").trim(),
    overs: row.overs ?? row.o ?? row.O ?? "",
    maidens: row.maidens ?? row.m ?? row.M ?? "",
    runs: row.runs ?? row.r ?? row.R ?? "",
    wickets: row.wickets ?? row.w ?? row.W ?? "",
    economy: row.economy ?? row.eco ?? row.Eco ?? "",
  };
}

function normalizeExtras(extras) {
  if (!extras) return null;
  if (typeof extras === "string") return { total: extras, detail: extras };
  return {
    total: extras.total ?? extras.runs ?? "",
    detail: String(extras.detail || extras.breakdown || "").trim(),
  };
}

function normalizeTotal(total) {
  if (!total) return null;
  if (typeof total === "string") return { label: total, crr: "" };
  return {
    label: String(total.label || total.score || "").trim(),
    overs: String(total.overs || "").trim(),
    crr: String(total.crr || total.runRate || "").trim(),
  };
}

function normalizeFow(row) {
  if (typeof row === "string") return { text: row };
  const wicket = row.wicket ?? row.order ?? row.number ?? "";
  const batter = String(row.batter || row.player || row.name || "").trim();
  const score = String(row.score || "").trim();
  const over = String(row.over || row.overs || "").trim();
  return { wicket, batter, score, over, text: row.text ? String(row.text) : "" };
}

export function scorecardSummaryLine(scorecard) {
  if (!scorecard) return "";
  if (scorecard.inningsSummary) return scorecard.inningsSummary;
  if (scorecard.total?.label) {
    const o = scorecard.total.overs ? ` (${scorecard.total.overs})` : "";
    return `${scorecard.total.label}${o}`;
  }
  return "";
}
