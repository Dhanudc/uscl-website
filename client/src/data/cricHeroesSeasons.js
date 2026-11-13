/** USCL Season 1 on CricHeroes */
export const DEFAULT_CRICHEROES_SEASON_ID = "season-1";

export const USCL_CRICHEROES_SEASON = {
  id: "season-1",
  label: "Season 1",
  year: "2026",
  tournamentId: "2249254",
  slug: "somireddy-group-presents-uscl-2026",
  /** Optional query for CricHeroes division/season picker, e.g. division_id=123 */
  iframeQuery: String(import.meta.env.VITE_CRICHEROES_SEASON1_QUERY || "").trim(),
};

export function resolveCricHeroesSeason(seasonId) {
  if (seasonId && seasonId !== USCL_CRICHEROES_SEASON.id) return USCL_CRICHEROES_SEASON;
  return USCL_CRICHEROES_SEASON;
}

function appendQuery(path, iframeQuery) {
  const query = iframeQuery?.startsWith("?")
    ? iframeQuery
    : iframeQuery
      ? `?${iframeQuery}`
      : "";
  return `${path}${query}`;
}

export function buildCricHeroesIframeSrc(season = USCL_CRICHEROES_SEASON) {
  const envOverride = String(import.meta.env.VITE_CRICHEROES_IFRAME_URL || "").trim();
  if (envOverride) return envOverride;
  if (!season?.tournamentId || !season?.slug) return "";
  const path = `https://iframe.cricheroes.com/tournament/${season.tournamentId}/${season.slug}/matches`;
  return appendQuery(path, season.iframeQuery);
}

export function buildCricHeroesPublicMatchesUrl(season = USCL_CRICHEROES_SEASON) {
  if (!season?.tournamentId || !season?.slug) return "https://cricheroes.com";
  const path = `https://cricheroes.com/tournament/${season.tournamentId}/${season.slug}/matches`;
  return appendQuery(path, season.iframeQuery);
}
