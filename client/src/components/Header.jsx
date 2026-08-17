import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemePicker from "./ThemePicker";

export default function Header() {
  const { user, loading, logout } = useAuth();

  const links = [
    { to: "/home", label: "Home" },
    { to: "/about", label: "About" },
    { to: "/franchises", label: "Teams" },
    ...(user ? [{ to: "/sponsorship", label: "Sponsors" }] : []),
    { to: "/media", label: "Media" },
    { to: "/live", label: "Live" },
    { to: "/wesley", label: "Wesley" },
    { to: "/franchise", label: "Own Team" },
    { to: "/register", label: "Register" },
    { to: "/player-journey", label: "Player Journey" },
  ];

  return (
    <header className="site-header sticky top-0 z-50 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5">
        <Link to="/home" className="flex shrink-0 items-center gap-2.5">
          <span className="font-display flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm text-white">
            USCL
          </span>
          <span>
            <span className="font-display block text-base leading-none text-[color:var(--title)]">
              Champions League
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-accent">
              Season 2026
            </span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-wrap items-center justify-center gap-0.5 md:justify-end lg:justify-center">
          {links.map((link) => (
            <NavLink
              key={`${link.label}-${link.to}`}
              to={link.to}
              end={link.to === "/home"}
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
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ThemePicker />
          {!loading && user ? (
            <>
              {user.role === "admin" && (
                <Link to="/admin" className="text-[13px] font-semibold text-accent">
                  Admin Dashboard
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
              <Link to="/register" className="btn-primary !py-1.5 !text-xs">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
