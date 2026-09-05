import { useEffect, useMemo, useState } from "react";
import { keyEvents } from "../data/siteContent";

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function KeyDatesSection({ className = "" }) {
  const now = useNow();
  const nextEvent = useMemo(
    () => keyEvents.find((event) => event.target.getTime() > now) || keyEvents[keyEvents.length - 1],
    [now]
  );

  return (
    <section className={className}>
      <div className="text-center">
        <p className="eyebrow text-accent">The Countdown Begins</p>
        <h2 className="font-display mt-1 text-2xl text-[color:var(--title)] md:text-[1.85rem]">
          Key dates for USCL 2026
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--text-muted)]">
          The franchises are ready. The players are ready. Here are the milestones that take us from
          registration to the trophy launch.
        </p>
        <p className="mt-4 font-display text-lg text-accent-soft md:text-xl">
          8 Franchises · 31 Matches · 1 Champion
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {keyEvents.map((event, index) => {
          const isNext = event.id === nextEvent.id;
          const isPast = event.target.getTime() <= now;
          return (
            <article
              key={event.id}
              className={`home-rise relative overflow-hidden border px-4 py-5 transition ${
                event.highlight || isNext
                  ? "border-accent bg-accent/10 shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_25%,transparent)]"
                  : "border-[color:var(--border)] bg-ink-card"
              }`}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                  {event.dateLabel}
                </p>
                {isNext ? (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Next
                  </span>
                ) : isPast ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                    Done
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                {event.timeLabel}
              </p>
              <h3 className="mt-3 font-display text-xl leading-tight text-[color:var(--title)]">
                {event.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--text-muted)]">{event.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
