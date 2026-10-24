import { Link } from "react-router-dom";
import { useSiteSettings } from "../context/SiteSettingsContext";

const COUNTDOWN_ITEMS = [
  { icon: "🏏", label: "Squad building" },
  { icon: "🎯", label: "Auction prep" },
  { icon: "⚡", label: "Next season" },
];

export default function RegistrationSeasonClosed() {
  const { registrationSeasonClosedCopy, socials } = useSiteSettings();
  const title = registrationSeasonClosedCopy?.title || "Registrations are closed for this season";
  const message =
    registrationSeasonClosedCopy?.message ||
    "Get ready for next season, stay tuned for USCL T20 updates. See you in season 2.";

  return (
    <section className="reg-closed" aria-labelledby="reg-closed-title">
      <div className="reg-closed__stadium" aria-hidden="true" />
      <div className="reg-closed__beam" aria-hidden="true" />
      <div className="reg-closed__confetti" aria-hidden="true" />

      <div className="reg-closed__inner">
        <p className="reg-closed__brand">USCL T20 · Season 2026</p>

        <div className="reg-closed__flag" role="status">
          <span className="reg-closed__flag-icon" aria-hidden="true">🔒</span>
          <span>Season roster locked</span>
        </div>

        <h1 id="reg-closed-title" className="reg-closed__title">{title}</h1>
        <p className="reg-closed__lead">{message}</p>

        <ul className="reg-closed__chips" aria-label="What is next">
          {COUNTDOWN_ITEMS.map((item, i) => (
            <li key={item.label} style={{ animationDelay: `${0.1 * i}s` }}>
              <span className="reg-closed__chip-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </li>
          ))}
        </ul>

        <div className="reg-closed__actions">
          <Link to="/player-journey" className="btn-primary">
            See the player journey
          </Link>
          <Link to="/home" className="btn-ghost">
            Back to home
          </Link>
          <Link to="/signin" className="btn-ghost">
            Sign in (existing players)
          </Link>
        </div>

        {socials?.length ? (
          <div className="reg-closed__social">
            <p>Follow USCL — we will announce when registration opens again</p>
            <div className="reg-closed__social-links">
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
