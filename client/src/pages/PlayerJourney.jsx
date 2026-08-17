import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";

const JOURNEY_STEPS = [
  {
    step: 1,
    title: "Player Registration",
    body: "Create your account and submit your player profile with photo and playing role.",
  },
  {
    step: 2,
    title: "Payment",
    body: "Complete the registration fee via Razorpay, or share UTR / payment screenshot.",
  },
  {
    step: 3,
    title: "Physical Verification",
    body: "Attend verification so your identity, eligibility, and documents are confirmed.",
  },
  {
    step: 4,
    title: "Player Card",
    body: "Get your official USCL player card once you clear verification.",
  },
  {
    step: 5,
    title: "Player Auction",
    body: "Enter the auction pool and get listed for franchise bidding.",
  },
  {
    step: 6,
    title: "Franchise Selection",
    body: "Get sold or assigned to a franchise and join your team squad.",
  },
  {
    step: 7,
    title: "League Matches",
    body: "Play league fixtures and fight for a playoff spot.",
  },
  {
    step: 8,
    title: "Semifinal",
    body: "Top teams battle in the knockout semifinals.",
  },
  {
    step: 9,
    title: "Final",
    body: "Two franchises compete for the USCL T20 crown.",
  },
  {
    step: 10,
    title: "Award Ceremony",
    body: "Celebrate champions, caps, and individual award winners.",
  },
];

const BENEFITS = [
  "Official USCL player registration and auction pathway",
  "Franchise cricket experience with staffing-industry teams",
  "Live match stage, media coverage, and player recognition",
  "Chance to win caps, MVP, and tournament awards",
];

const TERMS = [
  "Players must complete registration and payment to stay eligible.",
  "Physical verification is mandatory before the auction.",
  "Auction and franchise decisions follow USCL rules.",
  "Code of conduct applies across matches and ceremonies.",
  "Organizers may update schedules, venues, and formats as needed.",
];

const AWARDS = [
  "POM (Player of the Match)",
  "Super Striker",
  "Best Batsman",
  "Best Bowler",
  "Best Fielder",
  "Orange Cap",
  "Purple Cap",
  "MVP",
  "Highest Sixes of the Tournament",
  "Super Fours of the Tournament",
];

export default function PlayerJourney() {
  return (
    <PageShell
      eyebrow="Player Journey"
      title="From registration to the award ceremony"
      subtitle="Your full USCL path — register, get verified, enter the auction, play for a franchise, and chase the trophies."
    >
      <div className="flex flex-wrap gap-2">
        <Link to="/register" className="btn-primary">
          Start Registration
        </Link>
        <a href="#awards" className="btn-ghost">
          View Awards
        </a>
      </div>

      {/* Journey timeline — stacked on mobile, 2-col from md */}
      <section className="mt-10" aria-labelledby="journey-steps-heading">
        <h2 id="journey-steps-heading" className="font-display text-2xl text-[color:var(--title)] sm:text-3xl">
          The journey
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--text-muted)]">
          Ten steps from signup to the final night.
        </p>

        <ol className="relative mt-8 space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-10 md:gap-y-6 lg:grid-cols-5">
          {/* Vertical line on small screens */}
          <span
            className="pointer-events-none absolute bottom-4 left-[1.15rem] top-4 w-px bg-[color:var(--border)] md:hidden"
            aria-hidden="true"
          />

          {JOURNEY_STEPS.map((item) => (
            <li
              key={item.step}
              className="relative flex gap-3 rounded-xl border border-[color:var(--border)] bg-ink-card p-4 md:flex-col md:gap-2"
            >
              <span className="relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent font-display text-sm text-white shadow-sm md:h-10 md:w-10 md:text-base">
                {item.step}
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold text-[color:var(--title)]">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[color:var(--text-muted)]">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Side panels from the sketch */}
      <section className="mt-12 grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-[color:var(--border)] bg-ink-card p-5">
          <p className="eyebrow text-accent">Along the way</p>
          <h2 className="mt-1 font-display text-xl text-[color:var(--title)]">Player benefits</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-[color:var(--text-muted)]">
            {BENEFITS.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-[color:var(--border)] bg-ink-card p-5">
          <p className="eyebrow text-accent">Important</p>
          <h2 className="mt-1 font-display text-xl text-[color:var(--title)]">
            Terms &amp; conditions
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm text-[color:var(--text-muted)]">
            {TERMS.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </article>

        <article
          id="awards"
          className="scroll-mt-24 rounded-xl border border-[color:var(--border)] bg-ink-card p-5 lg:col-span-1"
        >
          <p className="eyebrow text-accent">Celebrate</p>
          <h2 className="mt-1 font-display text-xl text-[color:var(--title)]">Awards</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {AWARDS.map((award) => (
              <span
                key={award}
                className="rounded-full border border-[color:var(--border-strong)] px-2.5 py-1 text-xs font-medium text-[color:var(--text)]"
              >
                {award}
              </span>
            ))}
          </div>
        </article>
      </section>

      <div className="mt-10 rounded-xl border border-accent/40 bg-accent/10 p-5 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div>
          <p className="font-display text-xl text-[color:var(--title)]">Ready for step 1?</p>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Register now and begin your USCL player journey.
          </p>
        </div>
        <Link to="/register" className="btn-primary mt-4 inline-flex shrink-0 sm:mt-0">
          Register
        </Link>
      </div>
    </PageShell>
  );
}
