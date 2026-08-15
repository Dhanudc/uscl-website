import { useEffect, useState } from "react";
import { api } from "../api";

const emptyMatch = {
  matchNumber: "",
  stage: "league",
  teamAId: "",
  teamBId: "",
  scheduledAt: "",
  venue: "",
  status: "upcoming",
  teamAScore: "",
  teamBScore: "",
  winnerId: "",
  resultSummary: "",
};

const emptyLeader = {
  category: "batting",
  playerName: "",
  teamId: "",
  value: "",
  matches: "",
  note: "",
};

function toLocalInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminLivePage({ AdminShell }) {
  const [tab, setTab] = useState("matches");
  const [franchises, setFranchises] = useState([]);
  const [matches, setMatches] = useState([]);
  const [points, setPoints] = useState([]);
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(emptyMatch);
  const [editId, setEditId] = useState("");
  const [leaderForm, setLeaderForm] = useState(emptyLeader);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadMatches() {
    const data = await api("/api/admin/matches");
    setMatches(data.matches || []);
    setPoints(data.points || []);
    setFranchises(data.franchises || []);
  }

  async function loadLeaderboard() {
    const data = await api("/api/admin/leaderboard");
    setEntries(data.entries || []);
    if (data.franchises?.length) setFranchises(data.franchises);
  }

  useEffect(() => {
    Promise.all([loadMatches(), loadLeaderboard()]).catch((err) => setError(err.message));
  }, []);

  async function saveMatch(e) {
    e.preventDefault();
    setError("");
    setOk("");
    setBusy(true);
    try {
      const payload = {
        ...form,
        matchNumber: Number(form.matchNumber) || 0,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : "",
      };
      if (editId) {
        await api(`/api/admin/matches/${editId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setOk("Match updated.");
      } else {
        await api("/api/admin/matches", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setOk("Match created.");
      }
      setForm(emptyMatch);
      setEditId("");
      await loadMatches();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(match) {
    setEditId(match._id);
    setForm({
      matchNumber: match.matchNumber || "",
      stage: match.stage || "league",
      teamAId: match.teamAId || "",
      teamBId: match.teamBId || "",
      scheduledAt: toLocalInput(match.scheduledAt),
      venue: match.venue || "",
      status: match.status || "upcoming",
      teamAScore: match.teamAScore || "",
      teamBScore: match.teamBScore || "",
      winnerId: match.winnerId || "",
      resultSummary: match.resultSummary || "",
    });
    setTab("matches");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeMatch(id) {
    if (!window.confirm("Delete this match?")) return;
    setBusy(true);
    try {
      await api(`/api/admin/matches/${id}`, { method: "DELETE" });
      await loadMatches();
      setOk("Match deleted.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveLeader(e) {
    e.preventDefault();
    setError("");
    setOk("");
    setBusy(true);
    try {
      await api("/api/admin/leaderboard", {
        method: "POST",
        body: JSON.stringify({
          ...leaderForm,
          value: Number(leaderForm.value) || 0,
          matches: Number(leaderForm.matches) || 0,
        }),
      });
      setLeaderForm(emptyLeader);
      await loadLeaderboard();
      setOk("Leaderboard entry added.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeLeader(id) {
    if (!window.confirm("Delete this leaderboard entry?")) return;
    try {
      await api(`/api/admin/leaderboard/${id}`, { method: "DELETE" });
      await loadLeaderboard();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AdminShell
      title="Live updates"
      subtitle="Add fixtures and results. Points table updates automatically. Leaderboard is manual."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["matches", "Fixtures & results"],
          ["points", "Points table"],
          ["leaderboard", "Leaderboard"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              tab === id ? "bg-accent text-white" : "btn-ghost !py-1.5 !text-xs"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-accent">{error}</p>}
      {ok && <p className="mb-3 text-sm text-emerald-500">{ok}</p>}

      {tab === "matches" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <form onSubmit={saveMatch} className="rounded-xl border border-[color:var(--border)] bg-ink-card p-4">
            <h2 className="font-display text-lg text-[color:var(--title)]">
              {editId ? "Edit match" : "Add match"}
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-[color:var(--text-muted)]">Match #</span>
                <input
                  className="input-dark mt-1"
                  value={form.matchNumber}
                  onChange={(e) => setForm((f) => ({ ...f, matchNumber: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-[color:var(--text-muted)]">Stage</span>
                <select
                  className="input-dark mt-1"
                  value={form.stage}
                  onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
                >
                  <option value="league">League</option>
                  <option value="semi">Semi</option>
                  <option value="final">Final</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-[color:var(--text-muted)]">Team A</span>
                <select
                  className="input-dark mt-1"
                  required
                  value={form.teamAId}
                  onChange={(e) => setForm((f) => ({ ...f, teamAId: e.target.value }))}
                >
                  <option value="">Select</option>
                  {franchises.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-[color:var(--text-muted)]">Team B</span>
                <select
                  className="input-dark mt-1"
                  required
                  value={form.teamBId}
                  onChange={(e) => setForm((f) => ({ ...f, teamBId: e.target.value }))}
                >
                  <option value="">Select</option>
                  {franchises.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-[color:var(--text-muted)]">Date & time</span>
                <input
                  type="datetime-local"
                  className="input-dark mt-1"
                  required
                  value={form.scheduledAt}
                  onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-[color:var(--text-muted)]">Venue</span>
                <input
                  className="input-dark mt-1"
                  value={form.venue}
                  onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-[color:var(--text-muted)]">Status</span>
                <select
                  className="input-dark mt-1"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="live">Live</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-[color:var(--text-muted)]">Winner (if completed)</span>
                <select
                  className="input-dark mt-1"
                  value={form.winnerId}
                  onChange={(e) => setForm((f) => ({ ...f, winnerId: e.target.value }))}
                >
                  <option value="">No result / TBD</option>
                  {franchises.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-[color:var(--text-muted)]">Team A score</span>
                <input
                  className="input-dark mt-1"
                  placeholder="165/6 (20)"
                  value={form.teamAScore}
                  onChange={(e) => setForm((f) => ({ ...f, teamAScore: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-[color:var(--text-muted)]">Team B score</span>
                <input
                  className="input-dark mt-1"
                  placeholder="153/8 (20)"
                  value={form.teamBScore}
                  onChange={(e) => setForm((f) => ({ ...f, teamBScore: e.target.value }))}
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-[color:var(--text-muted)]">Result summary</span>
                <input
                  className="input-dark mt-1"
                  placeholder="Avengers won by 12 runs"
                  value={form.resultSummary}
                  onChange={(e) => setForm((f) => ({ ...f, resultSummary: e.target.value }))}
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? "Saving..." : editId ? "Update match" : "Add match"}
              </button>
              {editId ? (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setEditId("");
                    setForm(emptyMatch);
                  }}
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>

          <div className="space-y-2">
            {matches.length === 0 ? (
              <p className="text-sm text-[color:var(--text-muted)]">No matches yet.</p>
            ) : (
              matches.map((m) => (
                <article
                  key={m._id}
                  className="rounded-lg border border-[color:var(--border)] bg-ink-card px-3 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[color:var(--text-muted)]">
                        #{m.matchNumber || "-"} · {m.stage} · {m.status}
                      </p>
                      <p className="font-semibold text-[color:var(--title)]">
                        {m.teamAName} vs {m.teamBName}
                      </p>
                      <p className="text-xs text-[color:var(--text-muted)]">
                        {new Date(m.scheduledAt).toLocaleString()}
                        {m.venue ? ` · ${m.venue}` : ""}
                      </p>
                      {m.status === "completed" ? (
                        <p className="mt-1 text-xs text-accent-soft">
                          {m.teamAScore || "-"} | {m.teamBScore || "-"}
                          {m.resultSummary ? ` · ${m.resultSummary}` : ""}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="btn-ghost !py-1 !text-xs" onClick={() => startEdit(m)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-xs font-semibold text-accent"
                        onClick={() => removeMatch(m._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "points" && (
        <div className="overflow-x-auto rounded-xl border border-[color:var(--border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-ink-soft text-[color:var(--text-muted)]">
              <tr>
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2">P</th>
                <th className="px-3 py-2">W</th>
                <th className="px-3 py-2">L</th>
                <th className="px-3 py-2">NR</th>
                <th className="px-3 py-2">Pts</th>
              </tr>
            </thead>
            <tbody>
              {points.map((row) => (
                <tr key={row.id} className="border-t border-[color:var(--border)]">
                  <td className="px-3 py-2 text-[color:var(--title)]">{row.name}</td>
                  <td className="px-3 py-2">{row.played}</td>
                  <td className="px-3 py-2">{row.won}</td>
                  <td className="px-3 py-2">{row.lost}</td>
                  <td className="px-3 py-2">{row.noResult}</td>
                  <td className="px-3 py-2 font-semibold text-accent">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "leaderboard" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <form onSubmit={saveLeader} className="rounded-xl border border-[color:var(--border)] bg-ink-card p-4">
            <h2 className="font-display text-lg text-[color:var(--title)]">Add leaderboard entry</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-[color:var(--text-muted)]">Category</span>
                <select
                  className="input-dark mt-1"
                  value={leaderForm.category}
                  onChange={(e) => setLeaderForm((f) => ({ ...f, category: e.target.value }))}
                >
                  <option value="batting">Batting</option>
                  <option value="bowling">Bowling</option>
                  <option value="mvp">MVP</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-[color:var(--text-muted)]">Team</span>
                <select
                  className="input-dark mt-1"
                  value={leaderForm.teamId}
                  onChange={(e) => setLeaderForm((f) => ({ ...f, teamId: e.target.value }))}
                >
                  <option value="">Optional</option>
                  {franchises.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-[color:var(--text-muted)]">Player name</span>
                <input
                  className="input-dark mt-1"
                  required
                  value={leaderForm.playerName}
                  onChange={(e) => setLeaderForm((f) => ({ ...f, playerName: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-[color:var(--text-muted)]">Value (runs/wkts)</span>
                <input
                  className="input-dark mt-1"
                  value={leaderForm.value}
                  onChange={(e) => setLeaderForm((f) => ({ ...f, value: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-[color:var(--text-muted)]">Matches</span>
                <input
                  className="input-dark mt-1"
                  value={leaderForm.matches}
                  onChange={(e) => setLeaderForm((f) => ({ ...f, matches: e.target.value }))}
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-[color:var(--text-muted)]">Note</span>
                <input
                  className="input-dark mt-1"
                  value={leaderForm.note}
                  onChange={(e) => setLeaderForm((f) => ({ ...f, note: e.target.value }))}
                />
              </label>
            </div>
            <button type="submit" disabled={busy} className="btn-primary mt-4">
              Add entry
            </button>
          </form>

          <div className="space-y-2">
            {entries.length === 0 ? (
              <p className="text-sm text-[color:var(--text-muted)]">No leaderboard entries yet.</p>
            ) : (
              entries.map((entry) => (
                <article
                  key={entry._id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border)] bg-ink-card px-3 py-2.5"
                >
                  <div>
                    <p className="text-xs uppercase text-[color:var(--text-muted)]">{entry.category}</p>
                    <p className="font-semibold text-[color:var(--title)]">{entry.playerName}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      {entry.teamName || "—"} · {entry.value}
                      {entry.matches ? ` · ${entry.matches} matches` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-accent"
                    onClick={() => removeLeader(entry._id)}
                  >
                    Delete
                  </button>
                </article>
              ))
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
