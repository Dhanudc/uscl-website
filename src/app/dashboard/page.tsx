"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

type Registration = {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  interest: string;
  status: string;
  experienceYears: number;
  city?: string;
  adminNotes?: string;
  createdAt: string;
};

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [regs, setRegs] = useState<Registration[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/registrations", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        setRegs(data.registrations || []);
      })
      .catch((err) => setError(err.message));
  }, [user]);

  if (loading || !user) {
    return (
      <section className="px-4 py-20 text-center text-sm text-white/50">Loading dashboard...</section>
    );
  }

  return (
    <section className="border-b border-white/10 bg-ink px-4 py-12 md:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-accent">Dashboard</p>
            <h1 className="font-display mt-1 text-4xl tracking-tight text-white">
              Hello, {user.name.split(" ")[0]}
            </h1>
            <p className="mt-1 text-sm text-white/50">{user.email}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/register" className="btn-primary !py-2 !text-xs">
              {regs.length ? "View Registration" : "New Registration"}
            </Link>
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              className="btn-ghost !py-2 !text-xs"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="panel rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Account</p>
            <p className="mt-2 text-sm font-semibold text-white">{user.name}</p>
            <p className="text-xs text-white/45">{user.phone || "No phone"}</p>
            <p className="mt-1 text-xs text-white/45">{user.email}</p>
          </div>
          <div className="panel rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Registrations</p>
            <p className="font-display mt-2 text-3xl text-accent">{regs.length}</p>
          </div>
          <div className="panel rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Latest status</p>
            <p className="mt-2 text-sm font-semibold capitalize text-white">
              {regs[0]?.status || "None yet"}
            </p>
            {regs[0]?.adminNotes ? (
              <p className="mt-2 text-xs text-white/45">Note: {regs[0].adminNotes}</p>
            ) : null}
          </div>
        </div>

        <h2 className="font-display mt-10 text-2xl tracking-tight text-white">Your saved details</h2>
        {error && <p className="mt-2 text-sm text-accent">{error}</p>}
        <div className="mt-3 space-y-3">
          {regs.length === 0 ? (
            <div className="panel rounded-2xl p-5 text-sm text-white/55">
              No tournament registrations yet.{" "}
              <Link href="/register" className="font-semibold text-accent underline underline-offset-4">
                Register now
              </Link>
            </div>
          ) : (
            regs.map((reg) => (
              <div key={reg._id} className="panel rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{reg.fullName}</p>
                    <p className="text-sm text-white/50">
                      {reg.company} · {reg.role} · {reg.interest}
                    </p>
                  </div>
                  <span className="rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-soft">
                    {reg.status}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-white/80 sm:grid-cols-2">
                  <p>
                    <span className="text-white/40">Email:</span> {reg.email}
                  </p>
                  <p>
                    <span className="text-white/40">Phone:</span> {reg.phone}
                  </p>
                  <p>
                    <span className="text-white/40">Experience:</span> {reg.experienceYears} years
                  </p>
                  <p>
                    <span className="text-white/40">City:</span> {reg.city || "—"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
