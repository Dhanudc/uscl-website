import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { AlertBanner, PageLoader, StatusPill } from "../ui";

export default function SponsorPackagesAdmin({ AdminShell }) {
  const [packages, setPackages] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  function load() {
    setLoading(true);
    api("/api/admin/sponsors")
      .then((data) => {
        setPackages(data.packages || []);
        setBuyers(data.buyers || []);
        const next = {};
        for (const pkg of data.packages || []) {
          next[pkg.id] = {
            priceInr: pkg.priceInr,
            maxSlots: pkg.maxSlots,
            enabled: pkg.enabled !== false,
          };
        }
        setDrafts(next);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function updateDraft(id, patch) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function onSave(e) {
    e.preventDefault();
    setError("");
    setOk("");
    setSaving(true);
    try {
      const payload = packages.map((pkg) => ({
        id: pkg.id,
        priceInr: Math.round(Number(drafts[pkg.id]?.priceInr)),
        maxSlots: Math.round(Number(drafts[pkg.id]?.maxSlots)),
        enabled: drafts[pkg.id]?.enabled !== false,
      }));
      for (const row of payload) {
        if (!Number.isFinite(row.priceInr) || row.priceInr <= 0) {
          throw new Error("Each package needs a positive price in INR.");
        }
        if (!Number.isFinite(row.maxSlots) || row.maxSlots <= 0) {
          throw new Error("Each package needs at least one slot.");
        }
      }
      await api("/api/admin/sponsors/packages", {
        method: "PUT",
        body: JSON.stringify({ packages: payload }),
      });
      setOk("Sponsor packages saved.");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title="Sponsor packages"
      subtitle="Set package prices and slot limits. Sold count updates when sponsors pay successfully."
    >
      {loading ? (
        <PageLoader message="Loading sponsor packages…" />
      ) : (
        <div className="space-y-8">
          {error ? (
            <AlertBanner tone="error" onDismiss={() => setError("")}>
              {error}
            </AlertBanner>
          ) : null}
          {ok ? (
            <AlertBanner tone="ok" onDismiss={() => setOk("")}>
              {ok}
            </AlertBanner>
          ) : null}

          <form onSubmit={onSave} className="space-y-4">
            {packages.map((pkg) => (
              <section
                key={pkg.id}
                className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-ink-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4">
                  <div>
                    <h2 className="font-display text-lg text-[color:var(--title)]">{pkg.title}</h2>
                    <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                      {pkg.soldCount} sold · {pkg.available} available · {pkg.maxSlots} max
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={drafts[pkg.id]?.enabled !== false}
                      onChange={(e) => updateDraft(pkg.id, { enabled: e.target.checked })}
                    />
                    <span>Enabled on site</span>
                  </label>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="font-medium text-[color:var(--title)]">Price (INR)</span>
                    <input
                      type="number"
                      min="1"
                      className="input-dark mt-1.5"
                      value={drafts[pkg.id]?.priceInr ?? pkg.priceInr}
                      onChange={(e) => updateDraft(pkg.id, { priceInr: e.target.value })}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-[color:var(--title)]">Max slots</span>
                    <input
                      type="number"
                      min="1"
                      className="input-dark mt-1.5"
                      value={drafts[pkg.id]?.maxSlots ?? pkg.maxSlots}
                      onChange={(e) => updateDraft(pkg.id, { maxSlots: e.target.value })}
                    />
                  </label>
                </div>
              </section>
            ))}
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Save package settings"}
            </button>
          </form>

          <section className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-ink-card">
            <div className="border-b border-[color:var(--border)] px-5 py-4">
              <h2 className="font-display text-lg text-[color:var(--title)]">Paid sponsors</h2>
            </div>
            {buyers.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-[color:var(--text-muted)]">
                    <tr>
                      <th className="px-5 py-3">Company</th>
                      <th className="px-5 py-3">Contact</th>
                      <th className="px-5 py-3">Package</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buyers.map((b) => (
                      <tr key={b._id} className="border-t border-[color:var(--border)]">
                        <td className="px-5 py-3">
                          <p className="font-medium text-[color:var(--title)]">{b.company || b.fullName}</p>
                          <p className="text-xs text-[color:var(--text-muted)]">{b.fullName}</p>
                        </td>
                        <td className="px-5 py-3 text-[color:var(--text-muted)]">{b.email}</td>
                        <td className="px-5 py-3">{b.sponsorPackageTitle || b.sponsorPackageId || "—"}</td>
                        <td className="px-5 py-3">
                          <StatusPill tone={b.status === "verified" ? "success" : "muted"}>
                            {b.status}
                          </StatusPill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 py-6 text-sm text-[color:var(--text-muted)]">No paid sponsor purchases yet.</p>
            )}
          </section>

          <p className="text-sm text-[color:var(--text-muted)]">
            Public page:{" "}
            <Link to="/sponsorship" className="text-accent-soft" target="_blank" rel="noreferrer">
              /sponsorship
            </Link>
          </p>
        </div>
      )}
    </AdminShell>
  );
}
