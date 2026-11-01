import FranchiseLogoMark from "./FranchiseLogoMark";
import { findFranchise } from "../data/franchises";
import {
  matchDateTimeLabel,
  matchHasResult,
  matchIsLive,
  matchIsPast,
  matchSessionLabel,
} from "../utils/liveMatches";

function teamShort(teamId, teamName) {
  const team = findFranchise(teamId);
  return team?.shortName || teamName.split(" ").pop() || teamName;
}

function TeamLogo({ teamId, size = "md" }) {
  const team = findFranchise(teamId);
  if (!team) return null;
  const box =
    size === "lg"
      ? "h-16 w-16 sm:h-20 sm:w-20"
      : size === "sm"
        ? "h-10 w-10"
        : "h-14 w-14 sm:h-16 sm:w-16";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-md ring-2 ring-white/80 ${box}`}
    >
      <FranchiseLogoMark team={team} variant="thumb" imgClassName="h-[88%] w-[88%] object-contain" alt="" />
    </span>
  );
}

function TeamPick({ teamId, teamName, size, score, onClick }) {
  const inner = (
    <>
      <TeamLogo teamId={teamId} size={size} />
      <p
        className={`font-display text-[color:var(--title)] ${size === "lg" ? "text-lg sm:text-xl" : "text-sm"}`}
      >
        {teamShort(teamId, teamName)}
      </p>
      {score ? <p className="text-sm font-semibold text-accent-soft">{score}</p> : null}
    </>
  );

  const className = `flex min-w-0 flex-1 flex-col items-center gap-2 text-center sm:gap-3 ${
    onClick
      ? "rounded-xl transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      : ""
  }`;

  if (!onClick) {
    return <div className={className}>{inner}</div>;
  }

  return (
    <button
      type="button"
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={`View ${teamShort(teamId, teamName)} squad`}
    >
      {inner}
    </button>
  );
}

export function LiveMatchFaceoff({
  match,
  variant = "default",
  isNext = false,
  rowRef,
  id,
  onOpen,
}) {
  const past = matchIsPast(match);
  const live = matchIsLive(match);
  const showResult = past && matchHasResult(match);
  const hero = variant === "hero";
  const interactive = Boolean(onOpen);

  const open = (side) => {
    if (onOpen) onOpen(side);
  };

  return (
    <article
      ref={rowRef}
      id={id}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? () => open("a") : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                open("a");
              }
            }
          : undefined
      }
      className={
        (hero
          ? "live-match-hero relative overflow-hidden rounded-2xl border border-accent/35 bg-gradient-to-br from-accent/15 via-ink-card to-ink-soft p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] sm:p-6"
          : isNext
            ? "live-match-next rounded-xl border border-accent/50 bg-gradient-to-r from-accent/12 to-transparent p-4 ring-1 ring-accent/30"
            : past
              ? "rounded-xl border border-[color:var(--border)] bg-ink-soft/50 p-4 opacity-90"
              : "rounded-xl border border-[color:var(--border)] bg-ink-card/90 p-4 shadow-sm") +
        (interactive ? " cursor-pointer transition hover:border-accent/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" : "")
      }
    >
      {hero ? (
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/20 blur-2xl"
          aria-hidden
        />
      ) : null}

      <div className="relative flex flex-wrap items-start justify-between gap-2">
        <div>
          {hero ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Next upcoming match</p>
          ) : isNext ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">Next match</p>
          ) : null}
          <p
            className={`mt-1 font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)] ${
              hero ? "text-xs" : "text-[11px]"
            }`}
          >
            {matchSessionLabel(match.scheduledAt)}
            {match.matchNumber ? ` · Match ${match.matchNumber}` : ""}
          </p>
          {hero ? (
            <p className="mt-1 text-sm text-[color:var(--title)]">{matchDateTimeLabel(match.scheduledAt)}</p>
          ) : null}
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            live
              ? "bg-emerald-500/20 text-emerald-400"
              : past
                ? "bg-white/5 text-[color:var(--text-muted)]"
                : "bg-accent/15 text-accent-soft"
          }`}
        >
          {live ? "Live" : match.status}
        </span>
      </div>

      <div
        className={`relative mt-4 flex items-center justify-between gap-2 ${
          hero ? "sm:mt-6 sm:gap-4" : "mt-3"
        }`}
      >
        <TeamPick
          teamId={match.teamAId}
          teamName={match.teamAName}
          size={hero ? "lg" : "md"}
          score={showResult ? match.teamAScore : ""}
          onClick={interactive ? () => open("a") : undefined}
        />

        <div className="flex shrink-0 flex-col items-center px-1 pointer-events-none">
          <span
            className={`font-display text-[color:var(--text-muted)] ${hero ? "text-xl sm:text-2xl" : "text-sm"}`}
          >
            VS
          </span>
          {interactive ? (
            <span className="mt-1 text-[9px] uppercase tracking-wide text-[color:var(--text-muted)]">
              View match
            </span>
          ) : null}
        </div>

        <TeamPick
          teamId={match.teamBId}
          teamName={match.teamBName}
          size={hero ? "lg" : "md"}
          score={showResult ? match.teamBScore : ""}
          onClick={interactive ? () => open("b") : undefined}
        />
      </div>

      {showResult && match.resultSummary ? (
        <p className="mt-4 border-t border-[color:var(--border)] pt-3 text-center text-xs text-[color:var(--text-muted)]">
          {match.resultSummary}
        </p>
      ) : null}
      {past && !showResult ? (
        <p className="mt-3 text-center text-xs text-[color:var(--text-muted)]">Result pending</p>
      ) : null}
    </article>
  );
}
