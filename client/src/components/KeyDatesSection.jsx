import { useEffect, useMemo, useState } from "react";
import { keyEvents } from "../data/siteContent";
import { useSiteSettings } from "../context/SiteSettingsContext";

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function fallbackDates() {
  return keyEvents.map((event) => ({
    id: event.id,
    dateLabel: event.dateLabel,
    timeLabel: event.timeLabel,
    title: event.title,
    body: event.body,
    eventDate: event.target.toISOString(),
  }));
}

function DateCard({ event, badge }) {
  const completed = badge === "Completed";
  return (
    <article
      className={`relative overflow-hidden border px-4 py-5 ${
        badge === "Next"
          ? "border-accent bg-accent/10 shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_25%,transparent)]"
          : completed
            ? "border-[color:var(--border)] bg-ink-card opacity-80"
            : "border-[color:var(--border)] bg-ink-card"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">{event.dateLabel}</p>
        {badge ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${
              completed ? "bg-zinc-500" : "bg-accent"
            }`}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
        {event.timeLabel}
      </p>
      <h3 className="mt-3 font-display text-xl leading-tight text-[color:var(--title)]">{event.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--text-muted)]">{event.body}</p>
    </article>
  );
}

export default function KeyDatesSection({ className = "" }) {
  const now = useNow();
  const { keyDates } = useSiteSettings();
  const source = keyDates?.length ? keyDates : fallbackDates();

  const { rows, nextId } = useMemo(() => {
    const sorted = [...source].sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate));
    const next = sorted.find((event) => {
      const time = Date.parse(event.eventDate);
      return !Number.isFinite(time) || time > now;
    });
    return { rows: sorted, nextId: next?.id || "" };
  }, [source, now]);

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

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((event) => {
          const time = Date.parse(event.eventDate);
          const completed = Number.isFinite(time) && time <= now;
          const badge = completed ? "Completed" : event.id === nextId ? "Next" : "";
          return <DateCard key={event.id} event={event} badge={badge} />;
        })}
      </div>
    </section>
  );
}
