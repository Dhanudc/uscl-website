"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/franchises", label: "Teams" },
  { href: "/wesley", label: "Wesley" },
  { href: "/franchise", label: "Own Team" },
  { href: "/sponsorship", label: "Sponsors" },
  { href: "/register", label: "Register" },
];

export function Header() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent font-display text-xl text-white">
            USCL
          </span>
          <span className="leading-none">
            <span className="font-display block text-2xl text-white">Champions League</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
              Season 2026
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 xl:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm font-semibold uppercase tracking-wide transition ${
                  active
                    ? "bg-accent text-white"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          {!loading && user ? (
            <>
              {user.role === "admin" && (
                <Link href="/admin" className="text-sm font-semibold text-accent">
                  Admin
                </Link>
              )}
              <Link href="/dashboard" className="text-sm font-semibold text-accent-soft">
                {user.name.split(" ")[0]}
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:border-accent hover:text-accent"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost !py-2 !text-xs">
                Login
              </Link>
              <Link href="/signup" className="btn-primary !py-2 !text-xs">
                Sign Up
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-md border border-accent/40 px-3 py-2 text-xs font-bold uppercase tracking-wider text-accent xl:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-ink px-4 py-4 xl:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-3 text-sm font-semibold uppercase tracking-wide text-white/85 hover:bg-white/5"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-3 flex gap-2 border-t border-white/10 pt-3">
            {!loading && user ? (
              <>
                {user.role === "admin" && (
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="btn-primary flex-1 !py-2 text-center !text-xs"
                  >
                    Admin
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="btn-ghost flex-1 !py-2 text-center !text-xs"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  className="btn-ghost flex-1 !py-2 !text-xs"
                  onClick={async () => {
                    await logout();
                    setOpen(false);
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="btn-ghost flex-1 !py-2 text-center !text-xs"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="btn-primary flex-1 !py-2 text-center !text-xs"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
