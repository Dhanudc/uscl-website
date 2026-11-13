import {
  USCL_CRICHEROES_SEASON,
  buildCricHeroesIframeSrc,
  buildCricHeroesPublicMatchesUrl,
} from "../data/cricHeroesSeasons";

/** Official CricHeroes iframe paths for USCL 2026 Season 1 */
export const CRICHEROES_IFRAME = {
  matches: buildCricHeroesIframeSrc(USCL_CRICHEROES_SEASON),
};

export default function CricHeroesEmbed({ minHeight = "min(85vh, 960px)" }) {
  const season = USCL_CRICHEROES_SEASON;
  const src = buildCricHeroesIframeSrc(season);
  const publicUrl = buildCricHeroesPublicMatchesUrl(season);
  const title = `${season.label} — USCL on CricHeroes`;

  return (
    <div className="cricheroes-embed overflow-hidden rounded-xl border border-[color:var(--border)] bg-ink-card">
      <header className="flex flex-wrap items-center gap-2 border-b border-[color:var(--border)] bg-gradient-to-r from-[#0a1628] via-ink-card to-[#1a0a12] px-3 py-3 sm:px-4 sm:py-3.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Tournament</p>
        <span className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white shadow-md">
          {season.label}
          <span className="ml-1.5 text-[11px] font-medium text-white/85">{season.year}</span>
        </span>
      </header>

      {src ? (
        <iframe
          src={src}
          title={title}
          className="block w-full border-0 bg-white"
          style={{ minHeight, height: minHeight }}
          loading="lazy"
          allow="clipboard-write; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <p className="px-4 py-10 text-center text-sm text-[color:var(--text-muted)]">
          CricHeroes embed is not configured.
        </p>
      )}

      <p className="border-t border-[color:var(--border)] bg-ink-soft/60 px-4 py-2 text-center text-xs text-[color:var(--text-muted)]">
        {season.label} fixtures &amp; schedule from{" "}
        <a href={publicUrl} className="text-accent hover:underline" target="_blank" rel="noreferrer">
          CricHeroes
        </a>
      </p>
    </div>
  );
}
