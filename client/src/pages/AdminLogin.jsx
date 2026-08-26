import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import PasswordInput from "../components/PasswordInput";
import ThemePicker from "../components/ThemePicker";
import { useAuth } from "../context/AuthContext";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { user, loading, refresh } = useAuth();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user?.role === "admin") {
      navigate("/admin", { replace: true });
    }
  }, [loading, user, navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      const data = await api("/api/auth/admin-login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      await refresh();
      if (data.user?.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        setError("Not an admin account.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink text-[color:var(--title)]">
      <header className="border-b border-[color:var(--border)] px-4 py-3">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <p className="font-display text-lg text-accent">USCL Admin Portal</p>
          <div className="flex items-center gap-2">
            <ThemePicker compact />
            <Link to="/home" className="text-xs text-[color:var(--text-muted)] hover:text-[color:var(--text)]">
              Public website
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <p className="eyebrow">Staff access only</p>
          <h1 className="page-title mt-1.5">Admin login</h1>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">
            Separate from player login. Use this to view stats and approve or reject players.
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-5 space-y-3 rounded-lg border border-[color:var(--border)] bg-ink-card p-5"
          >
            <label className="block text-sm">
              <span className="text-[color:var(--text-muted)]">Admin email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                placeholder="admin@uscl.com"
                className="input-dark mt-1"
              />
            </label>
            <PasswordInput
              label="Password"
              name="password"
              required
              autoComplete="current-password"
              className="input-dark"
            />
            {error && <p className="text-sm text-accent">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? "Signing in..." : "Enter admin dashboard"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-[color:var(--text-muted)]">
            Players should use{" "}
            <Link to="/register" className="text-accent-soft">
              Registration
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
