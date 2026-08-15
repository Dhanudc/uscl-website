import Link from "next/link";
import { ArenaArt } from "@/components/ArenaArt";
import { FranchiseGrid } from "@/components/FranchiseGrid";
import { Marquee } from "@/components/Marquee";
import { StatStrip } from "@/components/StatStrip";

const fixtures = [
  { code: "M01", title: "Opening Night", meta: "Auction + Ceremony" },
  { code: "LG", title: "League Stage", meta: "31 Pro Matches" },
  { code: "SF", title: "Semi Finals", meta: "Knockout Heat" },
  { code: "F", title: "Grand Final", meta: "₹15L on the line" },
];

const pillars = [
  {
    num: "01",
    title: "Franchise Model",
    body: "8 exclusive teams, live player auction, pro jerseys and full team branding.",
  },
  {
    num: "02",
    title: "Business Meets Cricket",
    body: "CEOs, recruiters, HR leaders and staffing brands share one stadium.",
  },
  {
    num: "03",
    title: "Broadcast Ready",
    body: "Live streaming, digital campaigns, press coverage and ground activations.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="arena relative min-h-[85vh] border-b border-white/10">
        <ArenaArt />

        <div className="relative mx-auto grid min-h-[85vh] max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-[1.15fr_0.85fr] md:px-6">
          <div>
            <div className="anim-up inline-flex items-center gap-2 rounded-full border border-accent/50 bg-accent/15 px-3 py-1.5">
              <span className="live-dot h-2.5 w-2.5 rounded-full bg-accent" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent-soft">
                Live Season · 2026
              </span>
            </div>

            <p className="anim-up-d1 mt-6 text-sm font-bold uppercase tracking-[0.28em] text-white/50">
              US Staffing Champions League
            </p>

            <h1 className="anim-up-d1 font-display mt-3 text-6xl leading-[0.9] text-white md:text-7xl lg:text-8xl">
              Play Hard.
              <span className="block text-accent">Lead Harder.</span>
            </h1>

            <p className="anim-up-d2 mt-6 max-w-lg text-base text-white/65 md:text-lg">
              India’s premier franchise cricket league for the US Staffing industry —
              auction drama, stadium nights, and boardroom networking.
            </p>

            <div className="anim-up-d3 mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-primary">
                Create Account
              </Link>
              <Link href="/register" className="btn-ghost">
                Register to Play
              </Link>
              <Link href="/franchise" className="btn-ghost">
                Own Franchise
              </Link>
            </div>
          </div>

          <div className="anim-up-d2 scoreboard rounded-2xl p-5 md:p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-soft">
                  Match Centre
                </p>
                <p className="font-display mt-1 text-3xl text-white">USCL 2026</p>
              </div>
              <span className="rounded bg-accent px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-white">
                Live
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {fixtures.map((row) => (
                <div
                  key={row.code}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-display flex h-10 w-12 items-center justify-center rounded-md bg-accent text-lg text-white">
                      {row.code}
                    </span>
                    <div>
                      <p className="font-semibold text-white">{row.title}</p>
                      <p className="text-xs text-white/50">{row.meta}</p>
                    </div>
                  </div>
                  <span className="text-accent-soft">→</span>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
              <div>
                <p className="font-display text-3xl text-accent-soft">8</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Teams</p>
              </div>
              <div>
                <p className="font-display text-3xl text-accent-soft">31</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">
                  Matches
                </p>
              </div>
              <div>
                <p className="font-display text-3xl text-white">15L</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">
                  Prize ₹
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Marquee />

      <StatStrip
        stats={[
          { value: "08", label: "Franchises" },
          { value: "31", label: "Matches" },
          { value: "16", label: "Tournament Days" },
          { value: "15L", label: "Prize Pool" },
        ]}
      />

      <FranchiseGrid />

      <section className="bg-ink px-4 py-16 md:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">Why USCL</p>
              <h2 className="font-display mt-2 text-4xl text-white md:text-5xl">
                Built like a real league
              </h2>
            </div>
            <p className="max-w-md text-sm text-white/55 md:text-base">
              Franchise format. Auction theatre. Broadcast energy. Business outcomes.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {pillars.map((item) => (
              <article
                key={item.title}
                className="panel panel-hover relative overflow-hidden rounded-2xl p-6"
              >
                <p className="jersey-num font-display absolute -right-1 -top-3 text-8xl">
                  {item.num}
                </p>
                <p className="relative text-xs font-bold tracking-[0.2em] text-accent">{item.num}</p>
                <h3 className="font-display relative mt-4 text-3xl text-white">{item.title}</h3>
                <p className="relative mt-3 text-sm leading-relaxed text-white/55">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-ink-soft px-4 py-16 md:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-4xl text-white md:text-5xl">Choose your jersey path</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Sign Up", href: "/signup", hint: "Create player ID" },
              { title: "Login", href: "/login", hint: "Back to dressing room" },
              { title: "Register", href: "/register", hint: "Enter the auction" },
              { title: "Franchise", href: "/franchise", hint: "Buy a team" },
            ].map((item, i) => (
              <Link
                key={item.title}
                href={item.href}
                className="group rounded-2xl border-2 border-white/15 bg-ink-card p-5 transition hover:border-accent hover:bg-accent"
              >
                <p className="text-xs font-bold tracking-[0.2em] text-accent group-hover:text-white/70">
                  0{i + 1}
                </p>
                <p className="font-display mt-3 text-3xl text-white">{item.title}</p>
                <p className="mt-2 text-sm text-white/50 group-hover:text-white/80">{item.hint}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
