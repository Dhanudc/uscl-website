import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function ForgotPassword() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setResetLink("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const data = await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: form.get("email") }),
      });
      setMessage(data.message || "Check your email for the next step.");
      if (data.resetLink) setResetLink(data.resetLink);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="arena px-4 py-10 md:py-14">
      <div className="mx-auto max-w-md">
        <p className="eyebrow">Password help</p>
        <h1 className="page-title mt-1.5">Forgot password?</h1>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          Enter your registered email to create a password reset link.
        </p>

        {!resetLink ? (
          <form onSubmit={onSubmit} className="scoreboard mt-5 space-y-3 rounded-lg p-5">
            <label className="block text-sm">
              <span className="text-[color:var(--text-muted)]">Email</span>
              <input name="email" type="email" required className="input-dark mt-1" />
            </label>
            {error && <p className="text-sm text-accent">{error}</p>}
            {message && !resetLink && <p className="text-sm text-[color:var(--text)]">{message}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Please wait..." : "Get reset link"}
            </button>
          </form>
        ) : (
          <div className="scoreboard mt-5 space-y-3 rounded-lg p-5">
            <p className="text-sm text-[color:var(--text)]">{message}</p>
            <p className="text-xs text-[color:var(--text-muted)]">
              Email sending is not configured yet, so use this link now (valid for 1 hour):
            </p>
            <a href={resetLink} className="btn-primary inline-flex w-full text-center">
              Set new password
            </a>
            <p className="break-all text-[11px] text-[color:var(--text-muted)]">{resetLink}</p>
          </div>
        )}

        <p className="mt-5 text-sm text-[color:var(--text-muted)]">
          Remembered it?{" "}
          <Link to="/signin" className="text-accent-soft">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
