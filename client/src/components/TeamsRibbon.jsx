import { Link } from "react-router-dom";
import { franchises } from "../data/franchises";

/** Full-bleed ribbon of every franchise, scrolling right to left. */
export default function TeamsRibbon() {
  return (
    <section className="teams-ribbon" aria-label="USCL franchises">
      <div className="teams-ribbon__viewport">
        <div className="teams-ribbon__track">
          {[0, 1].map((copy) => (
            <div key={copy} className="teams-ribbon__group" aria-hidden={copy === 1}>
              {franchises.map((team) => (
                <Link
                  key={`${copy}-${team.id}`}
                  to="/franchises"
                  className="teams-ribbon__card"
                  style={{ "--team-accent": team.accent }}
                  tabIndex={copy === 1 ? -1 : undefined}
                >
                  <span className="teams-ribbon__sheen" aria-hidden="true" />
                  <span className="teams-ribbon__logo">
                    <img src={team.image} alt="" loading="lazy" decoding="async" />
                  </span>
                  <span className="teams-ribbon__meta">
                    <span className="teams-ribbon__name">
                      {team.shortName} {team.city}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
