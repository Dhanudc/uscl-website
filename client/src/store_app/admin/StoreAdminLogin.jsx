import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { storePath } from "../urls";

export default function StoreAdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api("/api/auth/admin-login", {
        method: "POST",
        portal: "admin",
        body: JSON.stringify({ email, password }),
      });
      navigate(storePath("/admin/products"));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-ink px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-[color:var(--border)] bg-ink-card p-6">
        <p className="eyebrow text-accent">USCL Store</p>
        <h1 className="font-display text-2xl text-[color:var(--title)]">Store admin</h1>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">Separate from league admin — merchandise only.</p>
        <input
          className="mt-6 w-full rounded border border-[color:var(--border)] bg-ink px-3 py-2"
          placeholder="Admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="mt-3 w-full rounded border border-[color:var(--border)] bg-ink px-3 py-2"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <p className="mt-3 text-sm text-accent">{error}</p> : null}
        <button type="submit" className="btn-primary mt-4 w-full justify-center" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
