import { useEffect, useMemo, useRef } from "react";
import {
  findNextMatchId,
  groupMatchesByDay,
} from "../utils/liveMatches";
import { LiveMatchFaceoff } from "./LiveMatchFaceoff";

export default function LiveScheduleList({ schedule, scrollToNextToken = 0, onOpenMatch }) {
  const groups = useMemo(() => groupMatchesByDay(schedule), [schedule]);
  const nextId = useMemo(() => findNextMatchId(schedule), [schedule]);
  const nextRef = useRef(null);

  useEffect(() => {
    if (!scrollToNextToken || !nextRef.current) return;
    const t = window.setTimeout(() => {
      nextRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [scrollToNextToken, nextId]);

  if (!schedule.length) {
    return (
      <p className="text-sm text-[color:var(--text-muted)]">Schedule is not available yet.</p>
    );
  }

  return (
    <div className="space-y-8">
      <header className="live-schedule-banner overflow-hidden rounded-2xl border border-[color:var(--border)] bg-gradient-to-r from-[#0a1628] via-ink-card to-[#1a0a12] px-4 py-5 sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent">Season 2026</p>
        <h2 className="mt-1 font-display text-2xl text-[color:var(--title)] sm:text-3xl">League fixtures</h2>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">28 league matches · Morning 9:00 AM & afternoon 12:30 PM ET</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            Morning · 9:00 AM ET
          </span>
          <span className="rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            Afternoon · 12:30 PM ET
          </span>
        </div>
      </header>

      {groups.map((group, groupIndex) => {
        const showMonth =
          groupIndex === 0 || groups[groupIndex - 1].monthYear !== group.monthYear;
        return (
          <section key={group.key}>
            {showMonth ? (
              <h3 className="mb-4 border-b border-[color:var(--border)] pb-2 font-display text-xl text-[color:var(--title)]">
                {group.monthYear}
              </h3>
            ) : null}

            <div className="live-schedule-day flex flex-col gap-4 sm:flex-row sm:gap-5">
              <div className="flex shrink-0 items-start gap-3 sm:w-28 sm:flex-col sm:gap-1">
                <div className="flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-accent text-center text-white shadow-lg sm:h-auto sm:w-full sm:rounded-lg sm:py-3">
                  <span className="text-[10px] font-bold uppercase leading-none opacity-90">{group.monthAbbr}</span>
                  <span className="font-display text-lg leading-none sm:text-2xl">{group.dayNum}</span>
                </div>
                <p className="hidden text-xs text-[color:var(--text-muted)] sm:block">{group.dayLabel}</p>
              </div>

              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                {group.matches.map((match) => {
                  const isNext = nextId && String(match._id || `static-${match.matchNumber}`) === nextId;
                  return (
                    <LiveMatchFaceoff
                      key={match._id || match.matchNumber}
                      match={match}
                      isNext={isNext}
                      rowRef={isNext ? nextRef : undefined}
                      id={match._id ? `schedule-match-${match._id}` : undefined}
                      onOpen={(side) => onOpenMatch?.(match, side)}
                    />
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
