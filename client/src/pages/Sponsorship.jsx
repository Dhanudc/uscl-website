import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { AlertBanner, CardGridSkeleton, EmptyState } from "../components/ui";
import { api } from "../api";

function formatInr(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 100000) {
    const lakh = n / 100000;
    return lakh % 1 === 0 ? `₹${lakh}L` : `₹${lakh.toFixed(1)}L`;
  }
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function Sponsorship() {
  const [packages, setPackages] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/sponsors/packages")
      .then((data) => {
        setPackages(data.packages || []);
        setSummary(data.summary || null);
      })
      .catch((err) => setError(err.message || "Unable to load sponsor packages."))
      .finally(() => setLoading(false));
  }, []);

  const mainPackages = packages.filter((p) => p.id !== "tournament");
  const tournamentPackages = packages.filter((p) => p.id === "tournament");

  return (
    <PageShell
      eyebrow="Partners"
      title="Sponsors"
      subtitle="Choose a package and buy your slot. Title, co-sponsor, and powered-by tiers are exclusive."
    >
      {summary ? (
        <div className="mb-6 flex flex-wrap gap-3">
          <span className="rounded-full border border-[color:var(--border)] bg-ink-card px-3 py-1 text-xs font-semibold text-[color:var(--title)]">
            {summary.totalAvailable} of {summary.totalSlots} slots available
          </span>
          <span className="rounded-full border border-[color:var(--border)] bg-ink-card px-3 py-1 text-xs text-[color:var(--text-muted)]">
            {summary.totalSold} sold
          </span>
        </div>
      ) : null}

      {error ? (
        <div className="mb-4">
          <AlertBanner tone="error">{error}</AlertBanner>
        </div>
      ) : null}

      {loading ? (
        <CardGridSkeleton count={4} tall />
      ) : packages.length === 0 ? (
        <EmptyState
          title="No sponsor packages yet"
          description="Packages will appear here once configured in the admin portal."
          action={
            <Link to="/home" className="btn-ghost">
              Back to home
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {mainPackages.map((pkg) => (
              <article
                key={pkg.id}
                className={`rounded-xl border bg-ink-card p-5 transition hover:border-accent/45 ${
                  pkg.isSoldOut ? "border-[color:var(--border)] opacity-80" : "border-accent/30"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-2xl text-[color:var(--title)]">{pkg.title}</h2>
                  <p className="text-sm font-semibold text-accent">{pkg.priceLabel || formatInr(pkg.priceInr)}</p>
                </div>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                  {pkg.isSoldOut ? (
                    <span className="text-amber-300">Sold out</span>
                  ) : (
                    <span>
                      {pkg.available} of {pkg.maxSlots} slot{pkg.maxSlots === 1 ? "" : "s"} left
                    </span>
                  )}
                </p>
                <p className="mt-2 text-sm text-[color:var(--text-muted)]">{pkg.blurb}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-[color:var(--text-muted)]">
                  {(pkg.benefits || []).map((b) => (
                    <li key={b}>• {b}</li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap gap-2">
                  {pkg.isSoldOut ? (
                    <button type="button" disabled className="btn-primary !cursor-not-allowed !opacity-50">
                      Sold out
                    </button>
                  ) : (
                    <Link
                      to={`/register?interest=sponsor&package=${encodeURIComponent(pkg.id)}`}
                      className="btn-primary"
                    >
                      Buy now →
                    </Link>
                  )}
                  <a href="/brand/wesley-elite-sports.png" download className="btn-ghost">
                    Download deck
                  </a>
                </div>
              </article>
            ))}
          </div>

          {tournamentPackages.length ? (
            <div id="benefits" className="mt-10 rounded-xl border border-[color:var(--border)] bg-ink-soft p-5">
              <h2 className="font-display text-xl text-[color:var(--title)]">Tournament Partners</h2>
              <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                Support logistics, hospitality, media, and match-day delivery.
              </p>
              {tournamentPackages.map((pkg) => (
                <div key={pkg.id} className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[color:var(--border)] bg-ink-card p-4">
                  <div>
                    <p className="font-display text-lg text-[color:var(--title)]">{pkg.title}</p>
                    <p className="text-sm text-accent">{pkg.priceLabel || formatInr(pkg.priceInr)}</p>
                    <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                      {pkg.isSoldOut
                        ? "Sold out"
                        : `${pkg.available} of ${pkg.maxSlots} partner slots available`}
                    </p>
                  </div>
                  {pkg.isSoldOut ? (
                    <button type="button" disabled className="btn-ghost !cursor-not-allowed !opacity-50">
                      Sold out
                    </button>
                  ) : (
                    <Link
                      to={`/register?interest=sponsor&package=${encodeURIComponent(pkg.id)}`}
                      className="btn-primary"
                    >
                      Buy partner slot
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </PageShell>
  );
}
