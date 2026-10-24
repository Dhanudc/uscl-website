import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSiteSettings } from "../context/SiteSettingsContext";
import RegisterCta from "./RegisterCta";
import SiteLogo from "./SiteLogo";
import ThemePicker from "./ThemePicker";
import { storeHomeUrl } from "../store_app/urls";

const NAV_LINKS = [
  { to: "/home", label: "Home", end: true },
  { to: "/about", label: "About", module: "about" },
  { to: "/franchises", label: "Teams", module: "teams" },
  { to: "/sponsorship", label: "Sponsors", module: "sponsors", signedInOnly: true },
  { to: "/media", label: "Media", module: "media" },
  { to: "/live", label: "Live", module: "live" },
  { to: "/wesley", label: "Wesley", module: "wesley" },
  { to: "/franchise", label: "Franchise Information", module: "franchise" },
  { to: "/register", label: "Register", module: "register", isRegister: true },
  { to: "/player-journey", label: "Player Journey", module: "playerJourney" },
  { to: "/referrals", label: "Rewards", module: "referrals" },
  { to: "/events", label: "Events", module: "events" },
  { label: "Store", module: "store", external: true },
];

const desktopLinkClass = (isActive) =>
  `inline-flex items-center rounded px-2 py-1.5 text-xs font-medium leading-none whitespace-nowrap 2xl:px-2.5 2xl:text-[13px] ${
    isActive
      ? "bg-accent text-white"
      : "text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
  }`;

function HeaderNavItem({ link, location, navLabel, variant }) {
  const label = link.module ? navLabel(link.module) || link.label : link.label;
  const isDesktop = variant === "desktop";

  if (link.isRegister) {
    if (isDesktop) {
      return (
        <RegisterCta
          className={desktopLinkClass(location.pathname.startsWith("/register"))}
          openLabel={navLabel("register") || "Register"}
          seasonClosedLabel="Registrations closed"
        />
      );
    }
    return (
      <RegisterCta
        className={navClass(location.pathname.startsWith("/register"))}
        openLabel={navLabel("register") || "Register"}
      />
    );
  }

  if (link.external) {
    const className = isDesktop ? desktopLinkClass(false) : navClass(false);
    return (
      <a
        href={storeHomeUrl()}
        className={className}
        onClick={() => window.scrollTo(0, 0)}
      >
        {label}
      </a>
    );
  }

  if (isDesktop) {
    return (
      <NavLink
        to={link.to}
        end={link.end}
        onClick={() => window.scrollTo(0, 0)}
        className={({ isActive }) => desktopLinkClass(isActive)}
      >
        {label}
      </NavLink>
    );
  }

  return (
    <NavLink
      to={link.to}
      end={link.end}
      onClick={() => window.scrollTo(0, 0)}
      className={({ isActive }) => navClass(isActive)}
    >
      {label}
    </NavLink>
  );
}

function navClass(isActive) {
  return `block rounded-md px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? "bg-accent text-white"
      : "text-[color:var(--text-muted)] hover:bg-[color:var(--ink-soft)] hover:text-[color:var(--text)]"
  }`;
}

export default function Header() {
  const { user, loading, logout } = useAuth();
  const { isModuleVisible, navLabel } = useSiteSettings();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = NAV_LINKS.filter((link) => {
    if (link.signedInOnly && !user) return false;
    if (link.module && !isModuleVisible(link.module)) return false;
    return true;
  }).map((link) => ({
    ...link,
    label: link.module ? navLabel(link.module) || link.label : link.label,
  }));

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle("mobile-nav-open", menuOpen);
    return () => document.body.classList.remove("mobile-nav-open");
  }, [menuOpen]);

  return (
    <header className="site-header sticky top-0 z-50 overflow-x-clip backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 lg:py-2.5">
        <Link
          to="/home"
          className="flex min-w-0 max-w-[42%] shrink-0 items-center gap-2 sm:max-w-none sm:gap-2.5"
          aria-label="USCL — US Staffing Champions League"
        >
          <span className="inline-flex h-10 w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-md bg-white sm:h-11 sm:w-[5.25rem]">
            <img
              src="/brand/uscl-logo.png"
              alt=""
              className="max-h-full max-w-full object-contain"
              width={84}
              height={44}
            />
          </span>
          <span className="min-w-0">
            <span className="font-display block truncate text-base leading-none text-[color:var(--title)]">
              Champions League
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-accent">
              Season 2026
            </span>
          </span>
        </Link>

        <nav
          className="site-header__nav hidden min-w-0 flex-1 items-center justify-center gap-0 xl:flex"
          aria-label="Main navigation"
        >
          {links.map((link) => (
            <HeaderNavItem
              key={`${link.label}-${link.to || "external"}`}
              link={link}
              location={location}
              navLabel={navLabel}
              variant="desktop"
            />
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
          <ThemePicker compact />
          <div className="hidden items-center gap-1.5 sm:flex">
            {!loading && user ? (
              <>
                {user.role === "admin" && (
                  <Link to="/admin" className="text-xs font-semibold text-accent 2xl:text-[13px]">
                    Admin
                  </Link>
                )}
                {user.role !== "admin" && (
                  <Link
                    to="/dashboard"
                    className="max-w-[5.5rem] truncate text-xs font-semibold text-accent-soft 2xl:max-w-none 2xl:text-[13px]"
                    title={user.name}
                  >
                    {user.name.split(" ")[0]}
                  </Link>
                )}
                <button type="button" onClick={logout} className="btn-ghost !px-2 !py-1.5 !text-xs">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/signin"
                  className="text-[13px] font-medium text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
                >
                  Sign in
                </Link>
                {isModuleVisible("register") ? (
                  <RegisterCta className="btn-primary !py-1.5 !text-xs" />
                ) : null}
              </>
            )}
          </div>
          <button
            type="button"
            className="mobile-menu-btn inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[color:var(--border)] text-[color:var(--text)] xl:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-panel"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="mobile-menu-icon" aria-hidden="true" />
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div
          id="mobile-nav-panel"
          className="mobile-nav-panel border-t border-[color:var(--border)] xl:hidden"
        >
          <nav className="mx-auto max-w-6xl px-4 py-3" aria-label="Mobile navigation">
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {links.map((link) => (
                <HeaderNavItem
                  key={`mobile-${link.label}-${link.to || "external"}`}
                  link={link}
                  location={location}
                  navLabel={navLabel}
                  variant="mobile"
                />
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2 border-t border-[color:var(--border)] pt-4 sm:hidden">
              {!loading && user ? (
                <>
                  {user.role === "admin" ? (
                    <Link to="/admin" className="btn-ghost w-full justify-center">
                      Admin Dashboard
                    </Link>
                  ) : (
                    <Link to="/dashboard" className="btn-ghost w-full justify-center">
                      Dashboard
                    </Link>
                  )}
                  <button type="button" onClick={logout} className="btn-ghost w-full justify-center">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/signin" className="btn-ghost w-full justify-center">
                    Sign in
                  </Link>
                  {isModuleVisible("register") ? (
                    <RegisterCta className="btn-primary w-full justify-center" />
                  ) : null}
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
