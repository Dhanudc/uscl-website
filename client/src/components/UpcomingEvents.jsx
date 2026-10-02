import { Link } from "react-router-dom";
import ZoomableImage from "./ZoomableImage";

export function formatEventWhen(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

export function EventPost({ event }) {
  const when = formatEventWhen(event.eventDate);
  const external = /^https?:\/\//i.test(event.link || "");
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[color:var(--border)] bg-ink-card text-center">
      {event.imageUrl ? (
        <ZoomableImage
          src={event.imageUrl}
          alt={event.title || "Event"}
          buttonClassName="block w-full"
          className="aspect-square w-full object-cover"
        />
      ) : null}
      <div className="flex flex-1 flex-col items-center px-5 py-6">
        {when ? (
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{when}</p>
        ) : null}
        <h3 className="mt-3 font-display text-2xl leading-tight text-[color:var(--title)]">{event.title}</h3>
        {event.caption ? (
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--text)]">{event.caption}</p>
        ) : null}
        {event.location ? (
          <p className="mt-4 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white">{event.location}</p>
        ) : null}
        {event.link ? (
          external ? (
            <a
              href={event.link}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex text-sm font-semibold text-accent"
            >
              Learn more
            </a>
          ) : (
            <Link to={event.link} className="mt-4 inline-flex text-sm font-semibold text-accent">
              Learn more
            </Link>
          )
        ) : null}
      </div>
    </article>
  );
}

export function UpcomingEventsStrip({ events }) {
  const posted = (events || []).filter((event) => event.imageUrl);
  if (!posted.length) return null;
  return (
    <section className="border-b border-[color:var(--border)] bg-ink px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-accent">Announcements</p>
            <h2 className="font-display mt-1 text-3xl text-[color:var(--title)]">Events</h2>
          </div>
          <Link to="/events" className="shrink-0 text-sm font-semibold text-accent">
            View all
          </Link>
        </div>
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2">
          {posted.map((event) => (
            <div key={event.id} className="w-[min(85vw,20rem)] shrink-0 snap-start">
              <EventPost event={event} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
