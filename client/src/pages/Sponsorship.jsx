import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { sponsorPackages, tournamentPartners } from "../data/siteContent";

export default function Sponsorship() {
  return (
    <PageShell
      eyebrow="Partners"
      title="Sponsors"
      subtitle="Title, Co-Sponsor, Powered By, Associate, and Tournament Partner packages. Only 80 sponsor slots."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {sponsorPackages.map((pkg) => (
          <article
            key={pkg.id}
            className="rounded-lg border border-[color:var(--border)] bg-ink-card p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl text-[color:var(--title)]">{pkg.title}</h2>
              <p className="text-sm font-semibold text-accent">{pkg.price}</p>
            </div>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">{pkg.blurb}</p>
            <ul className="mt-4 space-y-1.5 text-sm text-[color:var(--text-muted)]">
              {pkg.benefits.map((b) => (
                <li key={b}>• {b}</li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/register" className="btn-primary !py-1.5 !text-xs">
                Register
              </Link>
              <a href="#benefits" className="btn-ghost !py-1.5 !text-xs">
                Benefits
              </a>
              <a href="/brand/wesley-elite-sports.png" download className="btn-ghost !py-1.5 !text-xs">
                Download Deck
              </a>
            </div>
          </article>
        ))}
      </div>

      <div id="benefits" className="mt-10 rounded-lg border border-[color:var(--border)] bg-ink-soft p-5">
        <h2 className="font-display text-xl text-[color:var(--title)]">Tournament Partners</h2>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          Support logistics, hospitality, media, and match-day delivery.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tournamentPartners.map((label, i) => (
            <span
              key={`${label}-${i}`}
              className="inline-flex items-center justify-center rounded-md border border-dashed border-[color:var(--border)] px-2 py-5 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]"
            >
              {label} {i + 1}
            </span>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
