import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { aboutSections, siteStats } from "../data/siteContent";

export default function About() {
  return (
    <PageShell
      eyebrow="About USCL"
      title="US Staffing Champions League"
      subtitle="India's biggest staffing franchise cricket league — 8 franchises, live auction, and a national T20 stage."
    >
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {siteStats.map((s) => (
          <div key={s.label} className="rounded-lg border border-[color:var(--border)] bg-ink-card px-3 py-4 text-center">
            <p className="font-display text-2xl text-accent">{s.value}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 space-y-6">
        {aboutSections.map((block) => (
          <article key={block.id} className="border-b border-[color:var(--border)] pb-6 last:border-0">
            <h2 className="font-display text-2xl text-[color:var(--title)]">{block.title}</h2>
            <p className="mt-2 max-w-3xl text-[color:var(--text-muted)]">{block.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link to="/register" className="btn-primary">
          Register as Player
        </Link>
        <Link to="/franchise" className="btn-ghost">
          Own a Franchise
        </Link>
      </div>
    </PageShell>
  );
}
