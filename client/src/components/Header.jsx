import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSiteSettings } from "../context/SiteSettingsContext";
import RegisterCta from "./RegisterCta";
import ThemePicker from "./ThemePicker";

const NAV_LINKS = [
  { to: "/home", label: "Home", end: true },
  { to: "/about", label: "About", module: "about" },
  { to: "/franchises", label: "Teams", module: "teams" },
  { to: "/sponsorship", label: "Sponsors", module: "sponsors", signedInOnly: true },
  { to: "/media", label: "Media", module: "media" },
  { to: "/live", label: "Live", module: "live" },
  { to: "/wesley", label: "Wesley", module: "wesley" },
  { to: "/franchise", label: "Own A Team", module: "franchise" },
  { to: "/register", label: "Register", module: "register", isRegister: true },
  { to: "/player-journey", label: "Player Journey", module: "playerJourney" },
];

function navClass(isActive) {
  return `block rounded-md px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? "bg-accent text-white"
      : "text-[color:var(--text-muted)] hover:bg-[color:var(--ink-soft)] hover:text-[color:var(--text)]"
  }`;
}

export default function Header() {
  const { user, loading, logout } = useAuth();
  const { isModuleVisible } = useSiteSettings();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = NAV_LINKS.filter((link) => {
    if (link.signedInOnly && !user) return false;
    if (link.module && !isModuleVisible(link.module)) return false;
    return true;
  });

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle("mobile-nav-open", menuOpen);
    return () => document.body.classList.remove("mobile-nav-open");
  }, [menuOpen]);

  return (
    <header className="site-header sticky top-0 z-50 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        <Link
          to="/home"
          className="flex min-w-0 shrink-0 items-center gap-2.5"
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

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main navigation">
          {links.map((link) =>
            link.isRegister ? (
              <RegisterCta
                key={`${link.label}-${link.to}`}
                className={`rounded px-2.5 py-1.5 text-[13px] font-medium whitespace-nowrap ${
                  location.pathname.startsWith("/register")
                    ? "bg-accent text-white"
                    : "text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
                }`}
                openLabel="Register"
                closedLabel="Registration"
              />
            ) : (
              <NavLink
                key={`${link.label}-${link.to}`}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `rounded px-2.5 py-1.5 text-[13px] font-medium whitespace-nowrap ${
                    isActive
                      ? "bg-accent text-white"
                      : "text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
                  }`
                }
              >
                {link.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemePicker compact />
          <div className="hidden items-center gap-2 sm:flex">
            {!loading && user ? (
              <>
                {user.role === "admin" && (
                  <Link to="/admin" className="text-[13px] font-semibold text-accent">
                    Admin
                  </Link>
                )}
                {user.role !== "admin" && (
                  <Link to="/dashboard" className="text-[13px] font-semibold text-accent-soft">
                    {user.name.split(" ")[0]}
                  </Link>
                )}
                <button type="button" onClick={logout} className="btn-ghost !py-1.5 !text-xs">
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
            className="mobile-menu-btn inline-flex h-10 w-10 items-center justify-center rounded-md border border-[color:var(--border)] text-[color:var(--text)] lg:hidden"
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
          className="mobile-nav-panel border-t border-[color:var(--border)] lg:hidden"
        >
          <nav className="mx-auto max-w-6xl px-4 py-3" aria-label="Mobile navigation">
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {links.map((link) =>
                link.isRegister ? (
                  <RegisterCta
                    key={`mobile-${link.label}-${link.to}`}
                    className={navClass(location.pathname.startsWith("/register"))}
                    openLabel="Register"
                    closedLabel="Registration"
                  />
                ) : (
                  <NavLink
                    key={`mobile-${link.label}-${link.to}`}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) => navClass(isActive)}
                  >
                    {link.label}
                  </NavLink>
                )
              )}
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
