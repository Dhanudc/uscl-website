import { useCallback, useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import { api } from "../api";

const TABS = [
  { id: "fixtures", label: "Fixtures" },
  { id: "schedule", label: "Schedule" },
  { id: "points", label: "Points Table" },
  { id: "results", label: "Results" },
  { id: "leaderboard", label: "Leaderboard" },
];

function MatchCard({ match }) {
  const hasScore = Boolean(match.teamAScore || match.teamBScore || match.resultSummary);

  return (
    <article className="rounded-lg border border-[color:var(--border)] bg-ink-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
          #{match.matchNumber || "-"} · {match.stage} · {match.status}
        </p>
        <p className="text-xs text-[color:var(--text-muted)]">
          {new Date(match.scheduledAt).toLocaleString()}
        </p>
      </div>
      <p className="mt-1 font-display text-lg text-[color:var(--title)]">
        {match.teamAName} <span className="text-[color:var(--text-muted)]">vs</span> {match.teamBName}
      </p>
      {match.venue ? <p className="text-xs text-[color:var(--text-muted)]">{match.venue}</p> : null}
      {hasScore ? (
        <p className="mt-2 text-sm text-accent-soft">
          <span className="font-semibold text-[color:var(--title)]">{match.teamAName}</span>{" "}
          {match.teamAScore || "-"}
          <span className="mx-2 text-[color:var(--text-muted)]">|</span>
          <span className="font-semibold text-[color:var(--title)]">{match.teamBName}</span>{" "}
          {match.teamBScore || "-"}
          {match.resultSummary ? (
            <span className="mt-1 block text-[color:var(--text-muted)]">{match.resultSummary}</span>
          ) : null}
        </p>
      ) : null}
    </article>
  );
}

export default function LiveUpdates() {
  const [tab, setTab] = useState("fixtures");
  const [data, setData] = useState({
    fixtures: [],
    schedule: [],
    results: [],
    points: [],
    leaderboard: [],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api("/api/live");
      setData({
        fixtures: res.fixtures || [],
        schedule: res.schedule || [],
        results: res.results || [],
        points: res.points || [],
        leaderboard: res.leaderboard || [],
      });
      setUpdatedAt(new Date());
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 15000);
    return () => clearInterval(id);
  }, [load]);

  const batting = data.leaderboard.filter((e) => e.category === "batting");
  const bowling = data.leaderboard.filter((e) => e.category === "bowling");
  const mvp = data.leaderboard.filter((e) => e.category === "mvp");

  return (
    <PageShell
      eyebrow="Match centre"
      title="Live Updates"
      subtitle="Fixtures, schedule, points table, results, and leaderboard for USCL T20 Season 2026."
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border)] pb-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                tab === t.id
                  ? "bg-accent text-white"
                  : "text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => load()} className="btn-ghost !py-1.5 !text-xs">
          Refresh
          {updatedAt ? ` · ${updatedAt.toLocaleTimeString()}` : ""}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-accent">{error}</p>}
      {loading && <p className="mt-4 text-sm text-[color:var(--text-muted)]">Loading live data...</p>}

      {!loading && tab === "fixtures" && (
        <div className="mt-6 space-y-3">
          {data.fixtures.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">No upcoming fixtures yet.</p>
          ) : (
            data.fixtures.map((m) => <MatchCard key={m._id} match={m} />)
          )}
        </div>
      )}

      {!loading && tab === "schedule" && (
        <div className="mt-6 space-y-3">
          {data.schedule.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">Schedule will appear once matches are added.</p>
          ) : (
            data.schedule.map((m) => <MatchCard key={m._id} match={m} />)
          )}
        </div>
      )}

      {!loading && tab === "points" && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[color:var(--border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-ink-soft text-[color:var(--text-muted)]">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2">P</th>
                <th className="px-3 py-2">W</th>
                <th className="px-3 py-2">L</th>
                <th className="px-3 py-2">NR</th>
                <th className="px-3 py-2">Pts</th>
              </tr>
            </thead>
            <tbody>
              {data.points.map((row, i) => (
                <tr key={row.id} className="border-t border-[color:var(--border)]">
                  <td className="px-3 py-2 text-[color:var(--text-muted)]">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-[color:var(--title)]">{row.name}</td>
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

      {!loading && tab === "results" && (
        <div className="mt-6 space-y-3">
          {data.results.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">
              No completed matches yet. Set match status to <strong>Completed</strong> in admin to show here.
            </p>
          ) : (
            data.results.map((m) => <MatchCard key={m._id} match={m} />)
          )}
        </div>
      )}

      {!loading && tab === "leaderboard" && (
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            ["Batting", batting],
            ["Bowling", bowling],
            ["MVP", mvp],
          ].map(([title, list]) => (
            <section key={title}>
              <h2 className="font-display text-xl text-[color:var(--title)]">{title}</h2>
              <div className="mt-3 space-y-2">
                {list.length === 0 ? (
                  <p className="text-sm text-[color:var(--text-muted)]">No entries yet.</p>
                ) : (
                  list.map((entry) => (
                    <article
                      key={entry._id}
                      className="rounded-lg border border-[color:var(--border)] bg-ink-card px-3 py-2.5"
                    >
                      <p className="font-semibold text-[color:var(--title)]">{entry.playerName}</p>
                      <p className="text-xs text-[color:var(--text-muted)]">
                        {entry.teamName || "—"} · {entry.value}
                        {entry.matches ? ` · ${entry.matches} matches` : ""}
                      </p>
                      {entry.note ? (
                        <p className="mt-1 text-xs text-[color:var(--text-muted)]">{entry.note}</p>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
