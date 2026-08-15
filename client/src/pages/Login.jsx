import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import PasswordInput from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      await refresh();
      if (data.user?.status === "rejected") navigate("/pending");
      else navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="arena px-4 py-10 md:py-14">
      <div className="mx-auto max-w-md">
        <p className="eyebrow">Returning players</p>
        <h1 className="page-title mt-1.5">Sign in</h1>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          Use the password from registration, or reset it if you forgot.
        </p>
        <form onSubmit={onSubmit} className="scoreboard mt-5 space-y-3 rounded-lg p-5">
          <label className="block text-sm">
            <span className="text-[color:var(--text-muted)]">Email</span>
            <input name="email" type="email" required className="input-dark mt-1" />
          </label>
          <PasswordInput label="Password" name="password" required className="input-dark" />
          <div className="text-right">
            <Link to="/forgot-password" className="text-xs font-semibold text-accent-soft">
              Forgot password?
            </Link>
          </div>
          {error && <p className="text-sm text-accent">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="mt-5 text-sm text-[color:var(--text-muted)]">
          New player?{" "}
          <Link to="/register" className="text-accent-soft">
            Register
          </Link>
        </p>
      </div>
    </section>
  );
}
