import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import KeyDatesSection from "../components/KeyDatesSection";
import LiveFixturesPanel from "../components/LiveFixturesPanel";
import LiveScheduleList from "../components/LiveScheduleList";
import LiveMatchTeamPanel from "../components/LiveMatchTeamPanel";
import { LiveMatchFaceoff } from "../components/LiveMatchFaceoff";
import PageShell from "../components/PageShell";
import { buildStaticLeagueSchedule } from "../data/leagueFixtures2026";
import { findNextMatchId, pickUpcomingMatches } from "../utils/liveMatches";
import { formatNetRunRate } from "../utils/pointsDisplay";
import { api } from "../api";

const TABS = [
  { id: "fixtures", label: "Fixtures" },
  { id: "schedule", label: "Schedule" },
  { id: "points", label: "Points Table" },
  { id: "results", label: "Results" },
  { id: "leaderboard", label: "Leaderboard" },
];

function normalizeLiveResponse(res) {
  const apiSchedule = res?.schedule || [];
  const schedule = apiSchedule.length > 0 ? apiSchedule : buildStaticLeagueSchedule();
  const fixtures =
    res?.fixtures?.length > 0 ? res.fixtures : pickUpcomingMatches(schedule, 2);
  return {
    fixtures,
    schedule,
    results: res?.results || [],
    points: res?.points || [],
    leaderboard: res?.leaderboard || [],
    nextMatchId: res?.nextMatchId || findNextMatchId(schedule),
    fromApi: apiSchedule.length > 0,
  };
}

function emptyLiveState() {
  const schedule = buildStaticLeagueSchedule();
  return {
    fixtures: pickUpcomingMatches(schedule, 2),
    schedule,
    results: [],
    points: [],
    leaderboard: [],
    nextMatchId: findNextMatchId(schedule),
    fromApi: false,
  };
}

export default function LiveUpdates() {
  const [searchParams] = useSearchParams();
  const initialTab = TABS.some((t) => t.id === searchParams.get("tab")) ? searchParams.get("tab") : "fixtures";
  const [tab, setTab] = useState(initialTab);
  const [scheduleScrollToken, setScheduleScrollToken] = useState(0);
  const [data, setData] = useState(emptyLiveState);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [teamPanel, setTeamPanel] = useState(null);

  const openMatchPanel = useCallback((match, side = "a") => {
    setTeamPanel({ match, side });
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api("/api/live");
      setData(normalizeLiveResponse(res));
      setUpdatedAt(new Date());
      setError("");
    } catch (err) {
      setData(emptyLiveState());
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

  useEffect(() => {
    const fromUrl = searchParams.get("tab");
    if (fromUrl && TABS.some((t) => t.id === fromUrl) && fromUrl !== tab) {
      setTab(fromUrl);
      if (fromUrl === "schedule") setScheduleScrollToken((t) => t + 1);
    }
  }, [searchParams, tab]);

  function selectTab(id) {
    const openingSchedule = id === "schedule" && tab !== "schedule";
    setTab(id);
    if (openingSchedule) {
      setScheduleScrollToken((t) => t + 1);
    }
  }

  const batting = data.leaderboard.filter((e) => e.category === "batting");
  const bowling = data.leaderboard.filter((e) => e.category === "bowling");
  const mvp = data.leaderboard.filter((e) => e.category === "mvp");

  return (
    <PageShell
      eyebrow="Match centre"
      title="Live Updates"
      subtitle="Fixtures, schedule, points table, results, and leaderboard for USCL T20 Season 2026."
    >
      <KeyDatesSection className="mb-10" />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] bg-ink-soft/40 p-2">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                tab === t.id
                  ? "bg-accent text-white shadow-md"
                  : "text-[color:var(--text-muted)] hover:bg-white/5 hover:text-[color:var(--text)]"
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
      {loading && data.schedule.length === 0 ? (
        <p className="mt-4 text-sm text-[color:var(--text-muted)]">Loading live data...</p>
      ) : null}

      {tab === "fixtures" && (
        <div className="mt-8">
          <LiveFixturesPanel
            schedule={data.schedule}
            onViewSchedule={() => selectTab("schedule")}
            onOpenMatch={openMatchPanel}
          />
        </div>
      )}

      {tab === "schedule" && (
        <div className="mt-6">
          {!data.fromApi ? (
            <p className="mb-4 text-xs text-[color:var(--text-muted)]">
              Showing official Season 2026 schedule. Live scores update here once the match centre API is connected.
            </p>
          ) : null}
          <LiveScheduleList
            schedule={data.schedule}
            scrollToNextToken={scheduleScrollToken}
            onOpenMatch={openMatchPanel}
          />
        </div>
      )}

      {tab === "points" && (
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
                <th className="px-3 py-2">NRR</th>
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
                  <td className="px-3 py-2 tabular-nums text-[color:var(--text-muted)]">
                    {formatNetRunRate(row.netRunRate)}
                  </td>
                  <td className="px-3 py-2 font-semibold text-accent">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "results" && (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {data.results.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">
              No completed matches yet. Set match status to <strong>Completed</strong> in admin to show here.
            </p>
          ) : (
            data.results.map((m) => (
              <LiveMatchFaceoff
                key={m._id || m.matchNumber}
                match={m}
                variant="default"
                onOpen={(side) => openMatchPanel(m, side)}
              />
            ))
          )}
        </div>
      )}

      {tab === "leaderboard" && (
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

      {teamPanel ? (
        <LiveMatchTeamPanel
          match={teamPanel.match}
          side={teamPanel.side}
          onClose={() => setTeamPanel(null)}
        />
      ) : null}
    </PageShell>
  );
}
