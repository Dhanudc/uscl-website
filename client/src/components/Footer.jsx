import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { wesleyContent } from "../data/siteContent";

export default function Footer() {
  const { contact, socials } = useSiteSettings();
  const { user } = useAuth();

  return (
    <footer className="border-t border-[color:var(--border)] bg-ink">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-2xl text-accent">USCL T20</p>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">
            India&apos;s biggest staffing franchise cricket league.
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
            Organized by {wesleyContent.title}
          </p>
        </div>

        <div>
          <p className="eyebrow text-accent">Quick Links</p>
          <div className="mt-3 flex flex-col gap-1.5 text-sm text-[color:var(--text-muted)]">
            <Link to="/about">About USCL</Link>
            <Link to="/franchises">Franchises</Link>
            {user ? <Link to="/sponsorship">Sponsors</Link> : null}
            <Link to="/media">Media</Link>
            <Link to="/live">Live Updates</Link>
            <Link to="/register">Register</Link>
          </div>
        </div>

        <div>
          <p className="eyebrow text-accent">Tournaments</p>
          <div className="mt-3 flex flex-col gap-1.5 text-sm text-[color:var(--text-muted)]">
            <span>USCL T20 2026</span>
            <Link to="/wesley">Past Tournaments</Link>
            <Link to="/franchise">Own a Franchise</Link>
            <Link to="/live">Fixtures & Results</Link>
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
