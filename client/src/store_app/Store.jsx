import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { franchises } from "../data/franchises";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { isStoreHostname } from "./host";
import { mainSiteHomeUrl } from "./urls";
import StoreHeader from "./StoreHeader";

export default function Store() {
  const { socials, contact } = useSiteSettings();
  const onStoreHost = isStoreHostname();
  const mainSite = mainSiteHomeUrl();
  const [teaserIndex, setTeaserIndex] = useState(0);

  const teasers = useMemo(
    () => ["Matchday jerseys", "Franchise caps", "Training tees", "Limited fan packs"],
    []
  );

  const marquee = useMemo(
    () => franchises.flatMap((f) => [f.shortName, "•", f.city]).slice(0, -1),
    []
  );

  useEffect(() => {
    const id = setInterval(() => setTeaserIndex((i) => (i + 1) % teasers.length), 3200);
    return () => clearInterval(id);
  }, [teasers.length]);

  const notifyEmail = String(contact?.email || "info@usclt20.com").trim();
  const notifyHref = `mailto:${notifyEmail}?subject=${encodeURIComponent("USCL Store launch")}`;

  const socialLinks = (Array.isArray(socials) ? socials : []).filter((s) => {
    const href = String(s?.href || "").trim();
    return href && href !== "#";
  });

  return (
    <div className="store-soon store-soon--fit relative flex min-h-[100dvh] flex-col overflow-hidden bg-ink text-[color:var(--text)]">
      <div className="home-hero-bg absolute inset-0" aria-hidden="true" />
      <div className="store-soon__scan absolute inset-0 pointer-events-none opacity-[0.35]" aria-hidden="true" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {franchises.slice(0, 4).map((f, i) => (
          <span
            key={f.id}
            className="store-soon__orb absolute rounded-full blur-3xl"
            style={{
              background: f.accent,
              width: `${22 + i * 6}vmin`,
              height: `${22 + i * 6}vmin`,
              opacity: 0.12,
              top: `${8 + i * 16}%`,
              left: `${5 + i * 20}%`,
              animation: `store-float ${14 + i * 3}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      <StoreHeader />

      <main className="store-soon__main relative z-10 mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col items-center justify-center px-4 py-4 text-center sm:py-3">
        <p className="store-soon__eyebrow eyebrow text-accent">Official merchandise</p>

        <h1 className="store-soon__title home-fade-in mt-2 font-display leading-[0.92] tracking-tight text-[color:var(--title)] md:mt-1">
          USCL <span className="text-accent">Store</span>
        </h1>

        <p className="store-soon__lede mt-3 max-w-lg text-sm leading-relaxed text-[color:var(--text-muted)] sm:text-base">
          Jerseys, caps, and franchise pride — stitched for the league.
          <span className="text-[color:var(--text)]"> The pavilion shop opens soon.</span>
        </p>

        <p
          key={teaserIndex}
          className="store-soon__teaser home-fade-in mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent sm:text-sm"
        >
          Coming: {teasers[teaserIndex]}
        </p>

        <div className="store-soon__card home-fade-in mt-5 w-full max-w-sm sm:mt-6 md:max-w-md">
          <div className="store-soon__card-inner relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--ink-card)]/85 p-5 backdrop-blur-sm sm:p-6">
            <div className="store-soon__shimmer absolute inset-0 opacity-40" aria-hidden="true" />
            <div className="relative">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent">Drop 01</p>
              <p className="store-soon__card-title mt-1 font-display text-2xl text-[color:var(--title)] sm:text-3xl">
                Matchday Kit
              </p>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">8 franchises · Limited run</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {franchises.map((f) => (
                  <span
                    key={f.id}
                    className="h-2.5 w-2.5 rounded-full ring-1 ring-white/10"
                    style={{ background: f.accent }}
                    title={f.shortName}
                  />
                ))}
              </div>
              <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--title)]">
                <span className="store-soon__pulse h-2 w-2 rounded-full bg-accent" />
                Launching soon
              </p>
            </div>
          </div>
        </div>

        <div className="store-soon__actions mt-5 flex w-full max-w-sm flex-col gap-2.5 sm:max-w-none sm:flex-row sm:justify-center sm:gap-3 md:mt-4">
          <a href={notifyHref} className="btn-primary w-full justify-center py-2.5 text-sm sm:w-auto">
            Notify me
          </a>
          {onStoreHost ? (
            <a href={`${mainSite}/franchises`} className="btn-ghost w-full justify-center py-2.5 text-sm sm:w-auto">
              Explore franchises
            </a>
          ) : (
            <Link to="/franchises" className="btn-ghost w-full justify-center py-2.5 text-sm sm:w-auto">
              Explore franchises
            </Link>
          )}
        </div>

        {socialLinks.length > 0 && (
          <div className="store-soon__socials mt-4 flex flex-wrap justify-center gap-4 text-xs text-[color:var(--text-muted)] sm:text-sm">
            {socialLinks.map((s) => (
              <a
                key={`${s.label}-${s.href}`}
                href={String(s.href).trim()}
                target="_blank"
                rel="noreferrer"
                className="font-medium hover:text-accent"
              >
                {s.label || "Follow"}
              </a>
            ))}
          </div>
        )}
      </main>

      <div className="store-soon__ticker relative z-10 shrink-0 border-t border-[color:var(--border)] bg-[color:var(--ink-soft)]/50 py-2.5">
        <div className="store-soon__track flex w-max gap-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] sm:text-xs">
          {[...marquee, ...marquee].map((bit, i) => (
            <span key={i} className={bit === "•" ? "text-accent" : ""}>{bit}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
