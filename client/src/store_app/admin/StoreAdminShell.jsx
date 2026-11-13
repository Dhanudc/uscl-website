import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api } from "../../api";
import { storePath } from "../urls";

const NAV = [
  ["products", "Products"],
  ["brands", "Brands"],
  ["categories", "Categories"],
  ["orders", "Orders"],
  ["coupons", "Coupons"],
  ["customers", "Customers"],
  ["settings", "Settings"],
];

export default function StoreAdminShell({ children }) {
  const navigate = useNavigate();
  const [ok, setOk] = useState(null);
  const loginPath = storePath("/admin/login");

  useEffect(() => {
    api("/api/auth/me", { portal: "admin" })
      .then((d) => {
        if (d.user?.role === "admin") setOk(true);
        else setOk(false);
      })
      .catch(() => setOk(false));
  }, []);

  if (ok === null) {
    return <p className="p-8 text-center text-[color:var(--text-muted)]">Loading store admin…</p>;
  }
  if (!ok) return <Navigate to={loginPath} replace />;

  return (
    <div className="min-h-[100dvh] bg-ink text-[color:var(--text)]">
      <header className="border-b border-[color:var(--border)] px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="font-display text-xl">
            USCL Store <span className="text-accent">Admin</span>
          </p>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {NAV.map(([slug, label]) => (
              <Link key={slug} to={storePath(`/admin/${slug}`)} className="hover:text-accent">
                {label}
              </Link>
            ))}
            <Link to={storePath("/")} className="text-[color:var(--text-muted)] hover:text-accent">
              Storefront
            </Link>
            <button
              type="button"
              className="text-[color:var(--text-muted)] hover:text-accent"
              onClick={() => {
                api("/api/auth/logout", { method: "POST", portal: "admin" }).finally(() =>
                  navigate(loginPath)
                );
              }}
            >
              Logout
            </button>
          </nav>
        </div>
        <p className="mx-auto mt-2 max-w-6xl text-xs text-[color:var(--text-muted)]">
          Merchandise only — separate from league admin at www.usclt20.com/admin
        </p>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
