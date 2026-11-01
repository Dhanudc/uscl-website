import { useEffect, useState } from "react";
import { api } from "../api";
import { findFranchise } from "../data/franchises";
import { playerRoleLabel } from "../data/playerRoles";
import { profileImageUrl } from "../utils/media";
import { matchSessionLabel } from "../utils/liveMatches";
import { hasTeamScorecardDisplay } from "../utils/matchScorecard";
import FranchiseLogoMark from "./FranchiseLogoMark";
import MatchScorecardView from "./MatchScorecardView";
import SquadRoleBadge from "./SquadRoleBadge";
import ZoomableImage from "./ZoomableImage";

function teamShort(teamId, teamName) {
  const team = findFranchise(teamId);
  return team?.shortName || teamName?.split(" ").pop() || teamName || "Team";
}

function SquadList({ players, mentor, accent, loading, error }) {
  if (loading) {
    return <p className="mt-3 text-sm text-[color:var(--text-muted)]">Loading squad…</p>;
  }
  if (error) {
    return <p className="mt-3 text-sm text-accent">{error}</p>;
  }
  if (players.length === 0 && !mentor) {
    return (
      <p className="mt-3 text-sm text-[color:var(--text-muted)]">No sold players listed for this team yet.</p>
    );
  }

  return (
    <ul className="mt-3 space-y-2">
      {mentor ? (
        <li className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] bg-ink-card px-3 py-2.5">
          {profileImageUrl(mentor) ? (
            <ZoomableImage
              src={profileImageUrl(mentor)}
              alt={mentor.fullName}
              buttonClassName="h-11 w-11 shrink-0 overflow-hidden rounded-full"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
              {(mentor.fullName || "M").slice(0, 1)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[color:var(--title)]">{mentor.fullName}</p>
            <p className="text-xs text-[color:var(--text-muted)]">Team mentor</p>
          </div>
          <SquadRoleBadge role="mentor" accent={accent} compact />
        </li>
      ) : null}
      {players.map((p) => (
        <li
          key={p._id}
          className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] bg-ink-card px-3 py-2.5"
        >
          {profileImageUrl(p) ? (
            <ZoomableImage
              src={profileImageUrl(p)}
              alt={p.fullName}
              buttonClassName="h-11 w-11 shrink-0 overflow-hidden rounded-full"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-[color:var(--title)]">
              {(p.fullName || "?").slice(0, 1)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[color:var(--title)]">{p.fullName}</p>
            <p className="text-xs text-[color:var(--text-muted)]">{playerRoleLabel(p.role)}</p>
          </div>
          <SquadRoleBadge role={p.squadRole} accent={accent} compact />
        </li>
      ))}
    </ul>
  );
}

function useTeamSquad(teamId) {
  const [players, setPlayers] = useState([]);
  const [mentor, setMentor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!teamId) {
      setPlayers([]);
      setMentor(null);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    api(`/api/teams/${teamId}/players`)
      .then((data) => {
        if (cancelled) return;
        setPlayers(data.players || []);
        setMentor(data.mentor || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setPlayers([]);
        setError(err.message || "Unable to load squad.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  return { players, mentor, loading, error };
}

function TeamPanelContent({ match, side }) {
  const [panelTab, setPanelTab] = useState("scorecard");
  const teamId = side === "a" ? match.teamAId : match.teamBId;
  const teamName = side === "a" ? match.teamAName : match.teamBName;
  const team = findFranchise(teamId);
  const accent = team?.accent || "var(--accent)";
  const scoreLine = side === "a" ? match.teamAScore : match.teamBScore;
  const scorecardRaw = side === "a" ? match.teamAScorecard : match.teamBScorecard;
  const showScorecard = hasTeamScorecardDisplay(match, side);
  const { players, mentor, loading, error } = useTeamSquad(teamId);
  const displayName = team?.name || teamName;

  useEffect(() => {
    setPanelTab(showScorecard ? "scorecard" : "squad");
  }, [match, side, showScorecard]);

  return (
    <div>
      {showScorecard ? (
        <div className="mb-4 flex gap-1 rounded-lg bg-ink-soft p-1">
          {[
            ["scorecard", "Scorecard"],
            ["squad", "Squad"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPanelTab(id)}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${
                panelTab === id ? "bg-accent text-white" : "text-[color:var(--text-muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-xs text-[color:var(--text-muted)]">Result not posted yet — squad only.</p>
      )}

      {panelTab === "scorecard" && showScorecard ? (
        <MatchScorecardView
          scorecardRaw={scorecardRaw}
          teamName={displayName}
          fallbackScore={scoreLine}
          resultSummary={side === "a" ? match.resultSummary : ""}
        />
      ) : (
        <>
          <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Squad</h3>
          <SquadList players={players} mentor={mentor} accent={accent} loading={loading} error={error} />
        </>
      )}
    </div>
  );
}

/** Match popup: squads for both teams; scorecard when innings/scores exist. */
export default function LiveMatchTeamPanel({ match, side = "a", onClose }) {
  const [activeSide, setActiveSide] = useState(side === "b" ? "b" : "a");

  useEffect(() => {
    setActiveSide(side === "b" ? "b" : "a");
  }, [match, side]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!match) return null;

  const teamA = findFranchise(match.teamAId);
  const teamB = findFranchise(match.teamBId);
  const accent = (activeSide === "a" ? teamA : teamB)?.accent || "var(--accent)";

  return (
    <div
      className="fixed inset-0 z-[85] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-match-dialog-title"
        className="modal-sheet panel max-h-[90dvh] w-full overflow-hidden sm:max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full" style={{ background: accent }} />
        <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">Match details</p>
            <h2 id="live-match-dialog-title" className="font-display mt-0.5 text-xl text-[color:var(--title)]">
              {teamShort(match.teamAId, match.teamAName)}{" "}
              <span className="text-[color:var(--text-muted)]">vs</span>{" "}
              {teamShort(match.teamBId, match.teamBName)}
            </h2>
            <p className="text-xs text-[color:var(--text-muted)]">
              {matchSessionLabel(match.scheduledAt)}
              {match.matchNumber ? ` · Match ${match.matchNumber}` : ""}
            </p>
          </div>
          <button type="button" className="btn-ghost shrink-0 !py-1.5 !text-xs" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="flex gap-2 border-t border-b border-[color:var(--border)] px-4 py-2">
          {[
            ["a", teamA, match.teamAName],
            ["b", teamB, match.teamBName],
          ].map(([key, team, name]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveSide(key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold transition ${
                activeSide === key
                  ? "bg-accent text-white"
                  : "bg-ink-soft text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
              }`}
            >
              {team ? (
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-0.5">
                  <FranchiseLogoMark
                    team={team}
                    variant="thumb"
                    imgClassName="h-full w-full object-contain"
                    alt=""
                  />
                </span>
              ) : null}
              {teamShort(key === "a" ? match.teamAId : match.teamBId, name)}
            </button>
          ))}
        </div>

        <div className="max-h-[min(62dvh,58vh)] overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <TeamPanelContent match={match} side={activeSide} key={`${match._id || match.matchNumber}-${activeSide}`} />
        </div>
      </div>
    </div>
  );
}
