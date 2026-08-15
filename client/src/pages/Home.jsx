import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { AUCTION_TARGET, siteStats } from "../data/siteContent";

const HERO_SLIDES = [
  {
    title: "USCL T20",
    line: "US Staffing Champions League",
    text: "India's biggest staffing franchise cricket league.",
  },
  {
    title: "8 Franchises. One Crown.",
    line: "Season 2026",
    text: "Follow us for more updates – USCL T20",
  },
  {
    title: "Register. Auction. Play.",
    line: "Player Journey Opens Now",
    text: "From registration to the award ceremony — your path to the league.",
  },
];

function useCountdown(target) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return useMemo(() => {
    const diff = Math.max(0, target.getTime() - now);
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return { days, hours, minutes, seconds };
  }, [now, target]);
}

export default function Home() {
  const [slide, setSlide] = useState(0);
  const countdown = useCountdown(AUCTION_TARGET);
  const { socials } = useSiteSettings();
  const { user } = useAuth();

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 5500);
    return () => clearInterval(id);
  }, []);

  const current = HERO_SLIDES[slide];

  return (
    <>
      <section className="relative min-h-[78vh] overflow-hidden border-b border-[color:var(--border)]">
        <div className="home-hero-bg absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-end px-4 pb-14 pt-20 md:justify-center md:pb-20">
          <div key={slide} className="home-fade-in max-w-xl">
            <p className="font-display text-[clamp(3rem,10vw,5.5rem)] leading-[0.9] tracking-tight text-[color:var(--title)]">
              {current.title === "USCL T20" ? (
                <>
                  USCL <span className="text-accent">T20</span>
                </>
              ) : (
                current.title
              )}
            </p>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
              {current.line}
            </p>
            <p className="mt-3 max-w-md text-base text-[color:var(--text)]">{current.text}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/register" className="btn-primary">
                Register
              </Link>
              <Link to="/franchise" className="btn-ghost">
                Own Franchise
              </Link>
            </div>
            <div className="mt-8">
              <p className="text-xs text-[color:var(--text-muted)]">Follow us for more updates – USCL T20</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href || "#"}
                    target={s.href && s.href !== "#" ? "_blank" : undefined}
                    rel="noreferrer"
                    className="rounded-md border border-[color:var(--border)] px-2.5 py-1 text-xs text-[color:var(--text-muted)] hover:border-accent hover:text-accent"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 flex gap-2">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setSlide(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === slide ? "w-8 bg-accent" : "w-3 bg-[color:var(--border-strong)]"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[color:var(--border)] bg-ink-soft px-4 py-10">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
          {siteStats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-3xl text-accent md:text-4xl">{stat.value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="arena border-b border-[color:var(--border)] px-4 py-14">
        <div className="mx-auto max-w-6xl text-center">
          <p className="eyebrow text-accent">Auction</p>
          <h2 className="font-display mt-1 text-2xl text-[color:var(--title)] md:text-[1.85rem]">
            Auction starts in
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:gap-5">
            {[
              [countdown.days, "days"],
              [countdown.hours, "hours"],
              [countdown.minutes, "minutes"],
              [countdown.seconds, "seconds"],
            ].map(([value, label]) => (
              <div key={label} className="home-count min-w-[5.5rem] px-3 py-4 md:min-w-[7rem]">
                <p className="font-display text-4xl text-[color:var(--title)] md:text-5xl">
                  {String(value).padStart(2, "0")}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink px-4 py-12">
        <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["/about", "About USCL", "Vision, mission, format & members"],
            ["/franchises", "Teams", "8 franchise logos & Buy Now"],
            ...(user
              ? [["/sponsorship", "Sponsors", "Title, co-sponsor & partners"]]
              : [["/signin", "Sponsors", "Sign in to view sponsor packages"]]),
            ["/live", "Live Updates", "Fixtures, points & results"],
          ].map(([to, title, text]) => (
            <Link
              key={to}
              to={to}
              className="rounded-lg border border-[color:var(--border)] bg-ink-card px-4 py-5 transition hover:border-accent"
            >
              <p className="font-display text-xl text-[color:var(--title)]">{title}</p>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">{text}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
