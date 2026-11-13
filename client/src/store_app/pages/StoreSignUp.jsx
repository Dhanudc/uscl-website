import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import StoreHeader from "../StoreHeader";
import { useStoreCustomer } from "../StoreCustomerContext";
import { storePath } from "../urls";
import { storeApi } from "../storeApi";

export default function StoreSignUp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useStoreCustomer();
  const [signup, setSignup] = useState({ name: "", mobile: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from || storePath("/");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await storeApi("/api/store/customer/auth/signup", {
        method: "POST",
        body: JSON.stringify(signup),
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
        <h1 className="font-display text-3xl text-[color:var(--title)]">Sign up</h1>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">Create a store account for checkout and order history.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3 rounded-xl border border-[color:var(--border)] bg-ink-card p-5">
          <input
            required
            placeholder="Full name"
            className="w-full rounded border border-[color:var(--border)] bg-ink px-3 py-2"
            value={signup.name}
            onChange={(e) => setSignup({ ...signup, name: e.target.value })}
          />
          <input
            required
            placeholder="Mobile"
            className="w-full rounded border border-[color:var(--border)] bg-ink px-3 py-2"
            value={signup.mobile}
            onChange={(e) => setSignup({ ...signup, mobile: e.target.value })}
          />
          <input
            type="email"
            required
            placeholder="Email"
            className="w-full rounded border border-[color:var(--border)] bg-ink px-3 py-2"
            value={signup.email}
            onChange={(e) => setSignup({ ...signup, email: e.target.value })}
          />
          <input
            type="password"
            required
            placeholder="Password (6+ characters)"
            className="w-full rounded border border-[color:var(--border)] bg-ink px-3 py-2"
            value={signup.password}
            onChange={(e) => setSignup({ ...signup, password: e.target.value })}
          />
          {error ? <p className="text-sm text-accent">{error}</p> : null}
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-[color:var(--text-muted)]">
          Already have an account?{" "}
          <Link to={storePath("/signin")} state={{ from }} className="text-accent">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
