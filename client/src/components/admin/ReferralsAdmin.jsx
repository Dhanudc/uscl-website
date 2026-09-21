import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { AlertBanner, PageLoader } from "../ui";
import { useSiteSettings } from "../../context/SiteSettingsContext";

export default function ReferralsAdmin({ AdminShell }) {
  const { refresh } = useSiteSettings();
  const [enabled, setEnabled] = useState(true);
  const [topReferrers, setTopReferrers] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState({ referredCount: 0, referrerCount: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await api("/api/admin/referrals");
      setEnabled(data.referralProgramEnabled !== false);
      setTopReferrers(data.topReferrers || []);
      setReferrals(data.referrals || []);
      setStats(data.stats || { referredCount: 0, referrerCount: 0 });
    } catch (err) {
      setError(err.message || "Unable to load referrals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveEnabled(next) {
    setSaving(true);
    setError("");
    setOk("");
    try {
      const data = await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ referralProgramEnabled: next }),
      });
      setEnabled(data.settings?.referralProgramEnabled !== false);
      await refresh();
      setOk(next ? "Referral program is on." : "Referral program is off. The field is hidden on registration.");
    } catch (err) {
      setError(err.message || "Unable to save referral setting.");
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return referrals;
    const qDigits = q.replace(/\D/g, "");
    return referrals.filter((row) => {
      const hay = [
        row.playerCode,
        row.fullName,
        row.email,
        row.phone,
        row.referredByPlayerCode,
        row.referredByName,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q) || (qDigits.length >= 3 && String(row.phone || "").replace(/\D/g, "").includes(qDigits));
    });
  }, [referrals, search]);

  return (
    <AdminShell
      title="Referrals"
      subtitle="Turn the Player ID referral program on or off, then see who referred whom and the top counts."
    >
      {error ? (
        <div className="mb-3">
          <AlertBanner tone="error">{error}</AlertBanner>
        </div>
      ) : null}
      {ok ? (
        <div className="mb-3">
          <AlertBanner tone="ok">{ok}</AlertBanner>
        </div>
      ) : null}

      <section className="mb-5 overflow-hidden rounded-xl border border-[color:var(--border)] bg-ink-card">
        <div className="border-b border-[color:var(--border)] px-5 py-4">
          <p className="eyebrow text-accent">Referral section</p>
          <h2 className="font-display mt-1 text-xl text-[color:var(--title)]">Program on / off</h2>
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">
            When on, registration shows an optional Referral code field (Player ID). Existing
            registrations are not changed.
          </p>
        </div>
        <div className="space-y-3 p-5">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[color:var(--border)] px-4 py-3 hover:border-accent/40">
            <input
              type="radio"
              name="referralProgramEnabled"
              className="mt-1"
              checked={enabled === true}
              disabled={saving}
              onChange={() => saveEnabled(true)}
            />
            <span>
              <span className="block font-medium text-[color:var(--title)]">Referral program on</span>
              <span className="mt-0.5 block text-xs text-[color:var(--text-muted)]">
                Players can enter a referrer Player ID. Dashboard shows a References button.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[color:var(--border)] px-4 py-3 hover:border-accent/40">
            <input
              type="radio"
              name="referralProgramEnabled"
              className="mt-1"
              checked={enabled === false}
              disabled={saving}
              onChange={() => saveEnabled(false)}
            />
            <span>
              <span className="block font-medium text-[color:var(--title)]">Referral program off</span>
              <span className="mt-0.5 block text-xs text-[color:var(--text-muted)]">
                Hide the referral field. New codes are ignored. Past referrals stay in this list.
              </span>
            </span>
          </label>
        </div>
      </section>

      {loading ? (
        <PageLoader message="Loading referrals…" />
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-[color:var(--border)] bg-ink-card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                Referred players
              </p>
              <p className="font-display mt-1 text-3xl text-accent">{stats.referredCount}</p>
            </div>
            <div className="rounded-lg border border-[color:var(--border)] bg-ink-card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                Referrers
              </p>
              <p className="font-display mt-1 text-3xl text-accent">{stats.referrerCount}</p>
            </div>
          </div>

          <section className="mb-5 overflow-hidden rounded-xl border border-[color:var(--border)] bg-ink-card">
            <div className="border-b border-[color:var(--border)] px-5 py-4">
              <h2 className="font-display text-xl text-[color:var(--title)]">Top referral program</h2>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                Ranked by how many players used each referrer’s Player ID.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[color:var(--border)] text-xs uppercase tracking-wide text-[color:var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Referrer</th>
                    <th className="px-4 py-3">Player ID</th>
                    <th className="px-4 py-3">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {topReferrers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-[color:var(--text-muted)]">
                        No referrals recorded yet.
                      </td>
                    </tr>
                  ) : (
                    topReferrers.map((row, index) => (
                      <tr key={`${row.userId || row.playerCode}-${index}`} className="border-t border-[color:var(--border)]">
                        <td className="px-4 py-2.5 text-[color:var(--text-muted)]">{index + 1}</td>
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-[color:var(--title)]">{row.name || "—"}</p>
                          {row.email ? (
                            <p className="text-xs text-[color:var(--text-muted)]">{row.email}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-accent">
                          {(row.playerCodes || [row.playerCode]).filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-[color:var(--title)]">{row.count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-ink-card">
            <div className="flex flex-col gap-3 border-b border-[color:var(--border)] px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-xl text-[color:var(--title)]">Who referred whom</h2>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  Each row stores the referrer Player ID on the new player’s registration (linked to
                  the referrer’s user id).
                </p>
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search player or referrer"
                className="input-dark w-full sm:max-w-xs"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[color:var(--border)] text-xs uppercase tracking-wide text-[color:var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Player ID</th>
                    <th className="px-4 py-3">Referred by</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-[color:var(--text-muted)]">
                        No matching referred players.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => (
                      <tr key={row._id} className="border-t border-[color:var(--border)]">
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-[color:var(--title)]">{row.fullName}</p>
                          <p className="text-xs text-[color:var(--text-muted)]">{row.email}</p>
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-accent">{row.playerCode || "—"}</td>
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-[color:var(--title)]">
                            {row.referredByName || "—"}
                          </p>
                          <p className="text-xs text-accent">
                            Player ID {row.referredByPlayerCode || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-2.5 capitalize text-[color:var(--text-muted)]">
                          {row.interest || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-[color:var(--text-muted)]">
                          {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </AdminShell>
  );
}
