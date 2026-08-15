"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

type Stats = {
  usersCount: number;
  registrationsCount: number;
  pendingCount: number;
  verifiedCount: number;
  rejectedCount: number;
  franchiseCount: number;
  sponsorCount: number;
};

type Registration = {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  experienceYears: number;
  city?: string;
  interest: string;
  status: "pending" | "verified" | "rejected";
  adminNotes?: string;
  createdAt: string;
};

type AdminUser = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  createdAt: string;
};

type Tab = "overview" | "registrations" | "users";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [interestFilter, setInterestFilter] = useState("all");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && user.role !== "admin") router.replace("/dashboard");
  }, [loading, user, router]);

  async function loadStats() {
    const res = await fetch("/api/admin/stats", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load stats");
    setStats(data.stats);
  }

  async function loadRegistrations() {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (interestFilter !== "all") params.set("interest", interestFilter);
    const res = await fetch(`/api/admin/registrations?${params}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load registrations");
    setRegs(data.registrations || []);
    const seed: Record<string, string> = {};
    for (const r of data.registrations || []) {
      seed[r._id] = r.adminNotes || "";
    }
    setNotes(seed);
  }

  async function loadUsers() {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load users");
    setUsers(data.users || []);
  }

  useEffect(() => {
    if (!isAdmin) return;
    setError("");
    Promise.all([loadStats(), loadRegistrations(), loadUsers()]).catch((err) =>
      setError(err.message)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || tab !== "registrations") return;
    loadRegistrations().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, interestFilter, tab, isAdmin]);

  const pendingRegs = useMemo(
    () => regs.filter((r) => r.status === "pending"),
    [regs]
  );

  async function updateStatus(id: string, status: "verified" | "rejected" | "pending") {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes: notes[id] || "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      await Promise.all([loadRegistrations(), loadStats()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId("");
    }
  }

  if (loading || !user || !isAdmin) {
    return (
      <section className="px-4 py-20 text-center text-sm text-white/50">
        Checking admin access...
      </section>
    );
  }

  return (
    <section className="border-b border-white/10 bg-ink px-4 py-10 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-accent">Admin Panel</p>
            <h1 className="font-display mt-1 text-4xl text-white">USCL Control Room</h1>
            <p className="mt-1 text-sm text-white/50">Signed in as {user.email}</p>
          </div>
          <Link href="/dashboard" className="btn-ghost !py-2 !text-xs">
            Player Dashboard
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {(
            [
              ["overview", "Overview"],
              ["registrations", "Registrations"],
              ["users", "Users"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider ${
                tab === key
                  ? "bg-accent text-white"
                  : "border border-white/20 text-white/70 hover:border-accent hover:text-accent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-accent">{error}</p>}

        {tab === "overview" && stats && (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Users", value: stats.usersCount },
              { label: "Total Registrations", value: stats.registrationsCount },
              { label: "Pending", value: stats.pendingCount },
              { label: "Verified", value: stats.verifiedCount },
              { label: "Rejected", value: stats.rejectedCount },
              { label: "Franchise Interest", value: stats.franchiseCount },
              { label: "Sponsor Interest", value: stats.sponsorCount },
              { label: "Awaiting Action", value: pendingRegs.length },
            ].map((card) => (
              <div key={card.label} className="panel rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">{card.label}</p>
                <p className="font-display mt-2 text-3xl text-accent">{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "registrations" && (
          <div className="mt-8">
            <div className="flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-dark !w-auto rounded-lg"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={interestFilter}
                onChange={(e) => setInterestFilter(e.target.value)}
                className="input-dark !w-auto rounded-lg"
              >
                <option value="all">All interests</option>
                <option value="player">Player</option>
                <option value="franchise">Franchise</option>
                <option value="sponsor">Sponsor</option>
              </select>
            </div>

            <div className="mt-5 space-y-3">
              {regs.length === 0 ? (
                <div className="panel rounded-2xl p-5 text-sm text-white/50">
                  No registrations found for this filter.
                </div>
              ) : (
                regs.map((reg) => (
                  <article key={reg._id} className="panel rounded-2xl p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-white">{reg.fullName}</p>
                        <p className="text-sm text-white/50">
                          {reg.company} · {reg.role} · {reg.interest}
                        </p>
                      </div>
                      <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-soft">
                        {reg.status}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-white/75 sm:grid-cols-2 lg:grid-cols-3">
                      <p>
                        <span className="text-white/40">Email:</span> {reg.email}
                      </p>
                      <p>
                        <span className="text-white/40">Phone:</span> {reg.phone}
                      </p>
                      <p>
                        <span className="text-white/40">Experience:</span> {reg.experienceYears} yrs
                      </p>
                      <p>
                        <span className="text-white/40">City:</span> {reg.city || "—"}
                      </p>
                      <p>
                        <span className="text-white/40">Submitted:</span>{" "}
                        {new Date(reg.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <label className="mt-4 block text-xs text-white/50">
                      Admin notes
                      <textarea
                        value={notes[reg._id] || ""}
                        onChange={(e) =>
                          setNotes((prev) => ({ ...prev, [reg._id]: e.target.value }))
                        }
                        rows={2}
                        className="input-dark mt-1.5 rounded-lg"
                        placeholder="Optional note for approve/reject"
                      />
                    </label>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyId === reg._id}
                        onClick={() => updateStatus(reg._id, "verified")}
                        className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === reg._id}
                        onClick={() => updateStatus(reg._id, "rejected")}
                        className="rounded-full bg-accent px-4 py-2 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        disabled={busyId === reg._id}
                        onClick={() => updateStatus(reg._id, "pending")}
                        className="rounded-full border border-white/25 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/80 disabled:opacity-50"
                      >
                        Mark Pending
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="mt-8 space-y-2">
            {users.map((u) => (
              <div
                key={u._id}
                className="panel flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-white">{u.name}</p>
                  <p className="text-sm text-white/50">
                    {u.email}
                    {u.phone ? ` · ${u.phone}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-wider text-accent">
                    {u.role}
                  </p>
                  <p className="text-[11px] text-white/40">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
