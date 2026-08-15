import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const email = params.get("email") || "";
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    if (password !== confirm) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    try {
      const data = await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          token: form.get("token"),
          password,
        }),
      });
      setMessage(data.message);
      setTimeout(() => navigate("/signin"), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <section className="px-4 py-20 text-center text-[color:var(--text-muted)]">
        Missing reset token.{" "}
        <Link to="/forgot-password" className="text-accent">
          Request a new link
        </Link>
      </section>
    );
  }

  return (
    <section className="arena px-4 py-10 md:py-14">
      <div className="mx-auto max-w-md">
        <p className="eyebrow">Password help</p>
        <h1 className="page-title mt-1.5">Reset password</h1>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          Choose a new password for your player account.
        </p>
        <form onSubmit={onSubmit} className="scoreboard mt-5 space-y-3 rounded-lg p-5">
          <input type="hidden" name="token" value={token} />
          <label className="block text-sm">
            <span className="text-[color:var(--text-muted)]">Email</span>
            <input
              name="email"
              type="email"
              required
              defaultValue={email}
              readOnly={Boolean(email)}
              className="input-dark mt-1"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[color:var(--text-muted)]">New password</span>
            <input name="password" type="password" minLength={6} required className="input-dark mt-1" />
          </label>
          <label className="block text-sm">
            <span className="text-[color:var(--text-muted)]">Confirm password</span>
            <input name="confirm" type="password" minLength={6} required className="input-dark mt-1" />
          </label>
          {error && <p className="text-sm text-accent">{error}</p>}
          {message && <p className="text-sm text-emerald-500">{message}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
        <p className="mt-5 text-sm text-[color:var(--text-muted)]">
          <Link to="/signin" className="text-accent-soft">
            Back to Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
