import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { wesleyContent } from "../data/siteContent";

export default function Wesley() {
  const { title, tagline, about, vision, mission, pastTournaments } = wesleyContent;
  const { contact, socials } = useSiteSettings();

  return (
    <PageShell eyebrow="Organizer" title={title} subtitle={tagline}>
      <img
        src="/brand/wesley-elite-sports.png"
        alt="Wesley Elite Sports"
        className="mb-8 h-28 rounded-lg bg-white object-contain p-3"
      />

      <div className="grid gap-8 md:grid-cols-2">
        <article>
          <h2 className="font-display text-xl text-[color:var(--title)]">About</h2>
          <p className="mt-2 text-[color:var(--text-muted)]">{about}</p>
        </article>
        <article>
          <h2 className="font-display text-xl text-[color:var(--title)]">Vision</h2>
          <p className="mt-2 text-[color:var(--text-muted)]">{vision}</p>
        </article>
        <article>
          <h2 className="font-display text-xl text-[color:var(--title)]">Mission</h2>
          <p className="mt-2 text-[color:var(--text-muted)]">{mission}</p>
        </article>
        <article>
          <h2 className="font-display text-xl text-[color:var(--title)]">Past Tournaments</h2>
          <ul className="mt-2 space-y-1.5 text-[color:var(--text-muted)]">
            {pastTournaments.map((t) => (
              <li key={t}>• {t}</li>
            ))}
          </ul>
        </article>
      </div>

      <div className="mt-10 rounded-lg border border-[color:var(--border)] bg-ink-card p-5">
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
