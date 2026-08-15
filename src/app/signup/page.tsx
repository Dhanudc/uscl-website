"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ArenaArt } from "@/components/ArenaArt";

export default function SignupPage() {
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
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          password: form.get("password"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Signup failed");
        return;
      }
      await refresh();
      router.push("/register");
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
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent-soft">Join the league</p>
        <h1 className="font-display mt-2 text-5xl text-white">Sign Up</h1>
        <form onSubmit={onSubmit} className="scoreboard mt-7 space-y-3.5 rounded-2xl p-6">
          <label className="block text-sm">
            <span className="font-medium text-white/55">Full Name</span>
            <input name="name" required className="input-dark mt-1.5 rounded-lg" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-white/55">Email</span>
            <input name="email" type="email" required className="input-dark mt-1.5 rounded-lg" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-white/55">Phone</span>
            <input name="phone" type="tel" className="input-dark mt-1.5 rounded-lg" />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-white/55">Password</span>
            <input
              name="password"
              type="password"
              minLength={6}
              required
              className="input-dark mt-1.5 rounded-lg"
            />
          </label>
          {error && <p className="text-sm text-accent">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>
        <p className="mt-5 text-sm text-white/60">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-accent-soft hover:underline">
            Login
          </Link>
        </p>
      </div>
    </section>
  );
}
