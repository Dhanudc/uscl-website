import { Link } from "react-router-dom";
import { useSiteSettings } from "../context/SiteSettingsContext";

const PREVIEW_STEPS = [
  { n: "01", label: "Register" },
  { n: "02", label: "Verify" },
  { n: "03", label: "Auction" },
  { n: "04", label: "Play" },
];

export default function RegistrationComingSoon() {
  const { socials } = useSiteSettings();

  return (
    <section className="reg-soon">
      <div className="reg-soon__glow" aria-hidden="true" />
      <div className="reg-soon__ring" aria-hidden="true" />

      <div className="reg-soon__inner">
        <p className="reg-soon__brand">USCL T20</p>
        <span className="reg-soon__badge">Coming soon</span>

        <h1 className="reg-soon__title">
          Registration opens
          <span className="reg-soon__title-accent"> shortly</span>
        </h1>

        <p className="reg-soon__lead">
          Season 2026 is warming up. Player, captain, franchise, and sponsor registration will open
          soon — stay ready for the auction.
        </p>

        <div className="reg-soon__steps" aria-label="Player journey preview">
          {PREVIEW_STEPS.map((step, i) => (
            <div key={step.n} className="reg-soon__step" style={{ animationDelay: `${0.12 * i}s` }}>
              <span className="reg-soon__step-n">{step.n}</span>
              <span className="reg-soon__step-label">{step.label}</span>
              {i < PREVIEW_STEPS.length - 1 ? (
                <span className="reg-soon__step-line" aria-hidden="true" />
              ) : null}
            </div>
          ))}
        </div>

        <div className="reg-soon__actions">
          <Link to="/player-journey" className="btn-primary">
            Explore player journey
          </Link>
          <Link to="/home" className="btn-ghost">
            Back to home
          </Link>
          <Link to="/signin" className="btn-ghost">
            Sign in
          </Link>
        </div>

        {socials?.length ? (
          <div className="reg-soon__social">
            <p>Follow USCL for the open date</p>
            <div className="reg-soon__social-links">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href || "#"}
                  target={s.href && s.href !== "#" ? "_blank" : undefined}
                  rel="noreferrer"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
