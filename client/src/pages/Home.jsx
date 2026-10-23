import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import HeroFranchiseBanners from "../components/HeroFranchiseBanners";
import LeagueTagline from "../components/LeagueTagline";
import RegisterCta from "../components/RegisterCta";
import AuctionTopSoldStrip from "../components/AuctionTopSoldStrip";
import TeamsRibbon from "../components/TeamsRibbon";
import { UpcomingEventsStrip } from "../components/UpcomingEvents";
import { useAuth } from "../context/AuthContext";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { siteStats } from "../data/siteContent";

const HERO_SLIDES = [
  {
    title: "USCL T20",
    line: "US Staffing Champions League",
    tagline: true,
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

export default function Home() {
  const [slide, setSlide] = useState(0);
  const { socials, isModuleVisible, upcomingEvents, navLabel } = useSiteSettings();
  const { user } = useAuth();

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 5500);
    return () => clearInterval(id);
  }, []);

  const current = HERO_SLIDES[slide];

  return (
    <>
      <section className="relative min-h-0 overflow-hidden border-b border-[color:var(--border)] sm:min-h-[78vh]">
        <div className="home-hero-bg absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto flex min-h-0 max-w-6xl flex-col justify-center gap-6 px-4 py-10 sm:min-h-[78vh] sm:gap-8 sm:py-14 md:py-16 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div key={slide} className="home-fade-in w-full max-w-xl shrink-0 lg:max-w-[48%]">
            <p className="font-display text-[clamp(2rem,10vw,4.6rem)] leading-[0.95] tracking-tight text-[color:var(--title)]">
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
            {current.tagline ? (
              <LeagueTagline as="p" variant="hero" className="mt-3 max-w-md" />
            ) : (
              <p className="mt-3 max-w-md text-base text-[color:var(--text)]">{current.text}</p>
            )}
            <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <RegisterCta className="btn-primary w-full justify-center sm:w-auto" openLabel="Register" />
              <Link to="/player-journey" className="btn-ghost w-full justify-center sm:w-auto">
                Player Journey
              </Link>
              <Link to="/franchise" className="btn-ghost w-full justify-center sm:w-auto">
                Own A Franchise
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

            <div className="mt-8 flex gap-2">
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

          <div className="home-fade-in w-full shrink-0 lg:max-w-[48%]">
            <HeroFranchiseBanners />
          </div>
        </div>
      </section>

      <section className="stats-marquee border-b border-[color:var(--border)] bg-ink-soft py-8" aria-label="USCL season stats">
        <div className="stats-marquee-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="stats-marquee-group" aria-hidden={copy === 1}>
              {siteStats.map((stat) => (
                <div key={`${copy}-${stat.label}`} className="stats-marquee-item">
                  <p className="font-display text-3xl text-accent md:text-4xl">{stat.value}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="arena border-b border-[color:var(--border)] px-4 py-14">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="font-display text-[clamp(2.15rem,6.5vw,3.5rem)] leading-none tracking-tight text-[color:var(--title)]">
            AUCTION
          </h2>
          <AuctionTopSoldStrip />
        </div>
      </section>

      {isModuleVisible("events") ? <UpcomingEventsStrip events={upcomingEvents} /> : null}

      <TeamsRibbon />

      <section className="bg-ink px-4 py-12">
        <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            isModuleVisible("about")
              ? ["/about", "About USCL", "Vision, mission, format & members"]
              : null,
            isModuleVisible("teams")
              ? ["/franchises", "Teams", "8 franchise logos & Buy Now"]
              : null,
            isModuleVisible("sponsors")
              ? user
                ? ["/sponsorship", "Sponsors", "Title, co-sponsor & partners"]
                : ["/signin", "Sponsors", "Sign in to view sponsor packages"]
              : null,
            isModuleVisible("live")
              ? ["/live", "Live Updates", "Fixtures, points & results"]
              : null,
            isModuleVisible("media")
              ? ["/media", "Media", "Gallery photos and season videos"]
              : null,
            isModuleVisible("referrals")
              ? ["/referrals", "Rewards", "Referral and giveaway winners"]
              : null,
            isModuleVisible("events")
              ? ["/events", navLabel("events") || "Photos", "Photos and updates from the league"]
              : null,
          ]
            .filter(Boolean)
            .map(([to, title, text]) => (
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
