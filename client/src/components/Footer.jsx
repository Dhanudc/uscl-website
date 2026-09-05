import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSiteSettings } from "../context/SiteSettingsContext";
import LeagueTagline from "./LeagueTagline";
import RegisterCta from "./RegisterCta";
import { wesleyContent } from "../data/siteContent";

export default function Footer() {
  const { contact, socials, isModuleVisible } = useSiteSettings();
  const { user } = useAuth();

  return (
    <footer className="border-t border-[color:var(--border)] bg-ink pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:py-10 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-2xl text-accent">USCL T20</p>
          <LeagueTagline as="p" variant="compact" className="mt-2" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
            Organized by {wesleyContent.title}
          </p>
        </div>

        <div>
          <p className="eyebrow text-accent">Quick Links</p>
          <div className="mt-3 flex flex-col gap-1.5 text-sm text-[color:var(--text-muted)]">
            {isModuleVisible("about") ? <Link to="/about">About USCL</Link> : null}
            {isModuleVisible("teams") ? <Link to="/franchises">Franchises</Link> : null}
            {user && isModuleVisible("sponsors") ? <Link to="/sponsorship">Sponsors</Link> : null}
            {isModuleVisible("media") ? <Link to="/media">Media</Link> : null}
            {isModuleVisible("live") ? <Link to="/live">Live Updates</Link> : null}
            {isModuleVisible("register") ? (
              <RegisterCta className="text-left hover:text-[color:var(--text)]" />
            ) : null}
            {isModuleVisible("playerJourney") ? (
              <Link to="/player-journey">Player Journey</Link>
            ) : null}
          </div>
        </div>

        <div>
          <p className="eyebrow text-accent">Tournaments</p>
          <div className="mt-3 flex flex-col gap-1.5 text-sm text-[color:var(--text-muted)]">
            <span>USCL T20 2026</span>
            {isModuleVisible("wesley") ? <Link to="/wesley">Past Tournaments</Link> : null}
            {isModuleVisible("franchise") ? <Link to="/franchise">Own a Franchise</Link> : null}
            {isModuleVisible("live") ? <Link to="/live">Fixtures & Results</Link> : null}
          </div>
        </div>

        <div>
          <p className="eyebrow text-accent">Contact</p>
          <div className="mt-3 space-y-1.5 text-sm text-[color:var(--text-muted)]">
            <p>
              Email:{" "}
              <a href={`mailto:${contact.email}`} className="text-[color:var(--text)]">
                {contact.email}
              </a>
            </p>
            <p>
              Phone:{" "}
              <a href={`tel:${String(contact.phone || "").replace(/\s/g, "")}`} className="text-[color:var(--text)]">
                {contact.phone}
              </a>
            </p>
            <p>Address: {contact.address}</p>
          </div>
          <p className="eyebrow mt-5 text-accent">Social Media</p>
          <div className="mt-2 flex flex-wrap gap-2">
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
    </footer>
  );
}
