"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ArenaArt } from "@/components/ArenaArt";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      await refresh();
      router.push(data.user?.role === "admin" ? "/admin" : "/dashboard");
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
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent-soft">Welcome back</p>
        <h1 className="font-display mt-2 text-5xl text-white">Login</h1>
        <form onSubmit={onSubmit} className="scoreboard mt-7 space-y-3.5 rounded-2xl p-6">
          <label className="block text-sm">
            <span className="font-medium text-white/55">Email</span>
            <input name="email" type="email" required className="input-dark mt-1.5 rounded-lg" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-white/55">Password</span>
            <input name="password" type="password" required className="input-dark mt-1.5 rounded-lg" />
          </label>
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-accent-soft hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          {error && <p className="text-sm text-accent">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
        <p className="mt-5 text-sm text-white/60">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-accent-soft hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </section>
  );
}
