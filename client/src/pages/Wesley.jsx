import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { wesleyContent } from "../data/siteContent";

export default function Wesley() {
  const {
    title,
    tagline,
    about,
    vision,
    mission,
    services,
    trackRecord,
    tournamentJourney,
    pastTournaments,
  } = wesleyContent;
  const { contact, socials } = useSiteSettings();

  return (
    <PageShell eyebrow="Organizer" title={title} subtitle={tagline}>
      <div className="grid gap-10 md:grid-cols-2 md:gap-x-12 md:gap-y-10">
        <article>
          <h2 className="font-display text-2xl text-[color:var(--title)]">About</h2>
          <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-[color:var(--text-muted)]">
            {about}
          </p>
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
            {services.map((service) => (
              <span
                key={service}
                className="text-xs font-bold uppercase tracking-[0.12em] text-accent"
              >
                {service}
              </span>
            ))}
          </div>
        </article>
        <article>
          <h2 className="font-display text-2xl text-[color:var(--title)]">Vision</h2>
          <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-[color:var(--text-muted)]">
            {vision}
          </p>
        </article>
        <article>
          <h2 className="font-display text-2xl text-[color:var(--title)]">Mission</h2>
          <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-[color:var(--text-muted)]">
            {mission}
          </p>
        </article>
        <article>
          <h2 className="font-display text-2xl text-[color:var(--title)]">Past Tournaments</h2>
          <ul className="mt-3 space-y-2 text-[0.95rem] leading-relaxed text-[color:var(--text-muted)]">
            {pastTournaments.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div className="mt-14">
        <h2 className="font-display text-2xl text-[color:var(--title)] md:text-3xl">
          Proven Track Record
        </h2>
        <p className="mt-3 max-w-3xl text-[0.95rem] leading-relaxed text-[color:var(--text-muted)]">
          {trackRecord.intro}
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {trackRecord.stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-3xl text-accent md:text-4xl">{stat.value}</p>
              <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-14">
        <p className="eyebrow text-accent">Wesley Elite Sports</p>
        <h2 className="mt-1 font-display text-2xl text-[color:var(--title)] md:text-3xl">
          Tournament Journey
        </h2>

        <div className="mt-8 overflow-x-auto pb-2">
          <ol className="wesley-journey relative flex min-w-[52rem] gap-0 md:min-w-0">
            {tournamentJourney.map((item, index) => (
              <li
                key={`${item.date}-${item.event}`}
                className="relative flex flex-1 flex-col items-center px-2 text-center"
              >
                <p className="min-h-[2.5rem] text-sm font-bold uppercase tracking-wide text-[color:var(--title)]">
                  {item.date}
                </p>
                <span
                  className="relative z-[1] mt-3 h-3.5 w-3.5 rounded-full bg-accent ring-4 ring-accent/25"
                  aria-hidden
                />
                {index < tournamentJourney.length - 1 ? (
                  <span
                    className="absolute top-[calc(2.5rem+0.75rem+0.35rem)] left-[calc(50%+0.45rem)] right-[calc(-50%+0.45rem)] h-0.5 bg-accent"
                    aria-hidden
                  />
                ) : null}
                <p className="mt-4 text-xs font-semibold uppercase leading-snug tracking-wide text-emerald-400 sm:text-[0.7rem]">
                  {item.event}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-14 rounded-lg border border-[color:var(--border)] bg-ink-card p-5">
        <h2 className="font-display text-xl text-[color:var(--title)]">Contact</h2>
        <div className="mt-3 space-y-1.5 text-sm text-[color:var(--text-muted)]">
          <p>
            Email:{" "}
            <a href={`mailto:${contact.email}`} className="text-accent">
              {contact.email}
            </a>
          </p>
          <p>
            Phone:{" "}
            <a href={`tel:${String(contact.phone || "").replace(/\s/g, "")}`} className="text-accent">
              {contact.phone}
            </a>
          </p>
          <p>Address: {contact.address}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href || "#"}
              target={s.href && s.href !== "#" ? "_blank" : undefined}
              rel="noreferrer"
              className="btn-ghost !py-1.5 !text-xs"
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>

      <Link to="/home" className="mt-6 inline-flex text-sm font-semibold text-accent">
        ← Back to USCL Home
      </Link>
    </PageShell>
  );
}
