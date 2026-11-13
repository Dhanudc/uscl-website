import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import StoreHeader from "../StoreHeader";
import { useStoreCustomer } from "../StoreCustomerContext";
import { storePath } from "../urls";
import { storeApi } from "../storeApi";

export default function StoreSignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useStoreCustomer();
  const [login, setLogin] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from || storePath("/");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await storeApi("/api/store/customer/auth/login", {
        method: "POST",
        body: JSON.stringify(login),
      });
      await refresh();
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-ink text-[color:var(--text)]">
      <StoreHeader />
      <div className="mx-auto max-w-md px-4 py-10">
        <h1 className="font-display text-3xl text-[color:var(--title)]">Sign in</h1>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          Cart and orders are tied to your store account.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3 rounded-xl border border-[color:var(--border)] bg-ink-card p-5">
          <input
            type="email"
            required
            placeholder="Email"
            className="w-full rounded border border-[color:var(--border)] bg-ink px-3 py-2"
            value={login.email}
            onChange={(e) => setLogin({ ...login, email: e.target.value })}
          />
          <input
            type="password"
            required
            placeholder="Password"
            className="w-full rounded border border-[color:var(--border)] bg-ink px-3 py-2"
            value={login.password}
            onChange={(e) => setLogin({ ...login, password: e.target.value })}
          />
          <p className="text-xs text-[color:var(--text-muted)]">
            Forgot your password? Please email info@usclt20.com.
          </p>
          {error ? <p className="text-sm text-accent">{error}</p> : null}
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-[color:var(--text-muted)]">
          New here?{" "}
          <Link to={storePath("/signup")} state={{ from }} className="text-accent">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
