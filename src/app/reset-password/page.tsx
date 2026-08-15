"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArenaArt } from "@/components/ArenaArt";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const emailFromQuery = useMemo(() => searchParams.get("email") || "", [searchParams]);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
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
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          token: form.get("token"),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Reset failed");
        return;
      }
      setMessage(data.message || "Password updated.");
      setTimeout(() => router.push("/login"), 1200);
    } catch {
      setError("Unable to reach server.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="scoreboard mt-7 rounded-2xl p-6 text-sm text-white/70">
        Missing reset token.{" "}
        <Link href="/forgot-password" className="text-accent-soft underline">
          Request a new link
        </Link>
        .
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="scoreboard mt-7 space-y-3.5 rounded-2xl p-6">
      <input type="hidden" name="token" value={token} />
      <label className="block text-sm">
        <span className="font-medium text-white/55">Email</span>
        <input
          name="email"
          type="email"
          required
          defaultValue={emailFromQuery}
          className="input-dark mt-1.5 rounded-lg"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-white/55">New Password</span>
        <input
          name="password"
          type="password"
          minLength={6}
          required
          className="input-dark mt-1.5 rounded-lg"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-white/55">Confirm Password</span>
        <input
          name="confirm"
          type="password"
          minLength={6}
          required
          className="input-dark mt-1.5 rounded-lg"
        />
      </label>
      {error && <p className="text-sm text-accent">{error}</p>}
      {message && <p className="text-sm text-white/80">{message}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Updating..." : "Reset Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <section className="arena relative min-h-[75vh] border-b border-white/10 px-4 py-14 md:px-6">
      <ArenaArt compact />
      <div className="relative mx-auto max-w-md">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent-soft">
          Account recovery
        </p>
        <h1 className="font-display mt-2 text-5xl text-white">Reset Password</h1>
        <p className="mt-3 text-sm text-white/55">Choose a new password for your USCL account.</p>

        <Suspense fallback={<p className="mt-7 text-sm text-white/50">Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>

        <p className="mt-5 text-sm text-white/60">
          <Link href="/login" className="font-semibold text-accent-soft hover:underline">
            Back to Login
          </Link>
        </p>
      </div>
    </section>
  );
}
