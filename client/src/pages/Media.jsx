import PageShell from "../components/PageShell";
import { mediaCategories } from "../data/siteContent";

export default function Media() {
  return (
    <PageShell
      eyebrow="Coverage"
      title="Media"
      subtitle="News, gallery, and videos from USCL T20 — auctions, fixtures, and finals."
    >
      <div className="space-y-10">
        {mediaCategories.map((cat) => (
          <section key={cat.id} id={cat.id}>
            <h2 className="font-display text-2xl text-[color:var(--title)]">{cat.title}</h2>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">{cat.body}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {cat.items.map((item) => (
                <article
                  key={item}
                  className="rounded-lg border border-[color:var(--border)] bg-ink-card px-4 py-5"
                >
                  <p className="font-medium text-[color:var(--title)]">{item}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-[color:var(--text-muted)]">
                    {cat.title} · Coming soon
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
