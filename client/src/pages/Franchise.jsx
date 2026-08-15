import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { franchiseOffer } from "../data/siteContent";
import { franchises } from "../data/franchises";

export default function Franchise() {
  return (
    <PageShell
      eyebrow="Own a Team"
      title="Own a Franchise"
      subtitle={`Only ${franchiseOffer.slots} exclusive franchises. Investment ${franchiseOffer.investment}.`}
    >
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="font-display text-xl text-[color:var(--title)]">What you get</h2>
          <ul className="mt-3 space-y-2 text-[color:var(--text-muted)]">
            {franchiseOffer.perks.map((p) => (
              <li key={p} className="flex gap-2">
                <span className="text-accent">→</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/register" className="btn-primary">
              Register to Enquire
            </Link>
            <Link to="/franchises" className="btn-ghost">
              View Teams
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-[color:var(--border)] bg-ink-card p-5">
          <p className="eyebrow text-accent">Investment</p>
          <p className="font-display mt-1 text-4xl text-[color:var(--title)]">
            {franchiseOffer.investment}
          </p>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">
            Limited ownership slots for Season 2026. First three franchise identities are open for
            Buy Now enquiries.
          </p>
          <div className="mt-4 space-y-2">
            {franchises.slice(0, 3).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-md border border-[color:var(--border)] px-3 py-2"
              >
                <span className="text-sm text-[color:var(--title)]">{t.name}</span>
                <span className="text-xs font-bold uppercase text-accent">Available</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
