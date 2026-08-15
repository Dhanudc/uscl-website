"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArenaArt } from "@/components/ArenaArt";

export default function ForgotPasswordPage() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setResetLink("");
    setLoading(true);
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email") }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Request failed");
        return;
      }
      setMessage(data.message || "Check your email for reset instructions.");
      if (data.resetLink) setResetLink(data.resetLink);
    } catch {
      setError("Unable to reach server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="arena relative min-h-[75vh] border-b border-white/10 px-4 py-14 md:px-6">
      <ArenaArt compact />
      <div className="relative mx-auto max-w-md">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent-soft">
          Account recovery
        </p>
        <h1 className="font-display mt-2 text-5xl text-white">Forgot Password</h1>
        <p className="mt-3 text-sm text-white/55">
          Enter your account email and we’ll generate a secure reset link.
        </p>

        <form onSubmit={onSubmit} className="scoreboard mt-7 space-y-3.5 rounded-2xl p-6">
          <label className="block text-sm">
            <span className="font-medium text-white/55">Email</span>
            <input name="email" type="email" required className="input-dark mt-1.5 rounded-lg" />
          </label>
          {error && <p className="text-sm text-accent">{error}</p>}
          {message && <p className="text-sm text-white/80">{message}</p>}
          {resetLink && (
            <div className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm">
              <p className="font-semibold text-accent-soft">Your reset link</p>
              <p className="mt-1 break-all text-white/70">{resetLink}</p>
              <Link
                href={resetLink}
                className="btn-primary mt-3 inline-flex !py-2 !text-xs"
              >
                Open reset page
              </Link>
              <p className="mt-2 text-[11px] text-white/40">
                Link expires in 1 hour. (Email sending can be connected later.)
              </p>
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Sending..." : "Get Reset Link"}
          </button>
        </form>

        <p className="mt-5 text-sm text-white/60">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-accent-soft hover:underline">
            Back to Login
          </Link>
        </p>
      </div>
    </section>
  );
}
