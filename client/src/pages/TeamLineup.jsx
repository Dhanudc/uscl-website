import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import FranchiseLogoMark from "../components/FranchiseLogoMark";
import { findFranchise, franchises } from "../data/franchises";
import { PLAYER_ROLES, playerRoleLabel } from "../data/playerRoles";
import SquadRoleBadge from "../components/SquadRoleBadge";
import ZoomableImage from "../components/ZoomableImage";
import { profileImageUrl } from "../utils/media";

export default function TeamLineup() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [franchise, setFranchise] = useState(null);
  const [lineup, setLineup] = useState([]);
  const [permissions, setPermissions] = useState({ canEdit: false, mySquadRole: "player" });
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teamMentor, setTeamMentor] = useState(null);

  const load = useCallback(() => {
    setBusy(true);
    setError("");
    api("/api/registrations/team-lineup")
      .then((data) => {
        setTeam(data.team);
        setFranchise(franchises.find((f) => f.id === data.team?.id) || null);
        setLineup(data.lineup || []);
        setDraft(data.lineup || []);
        setPermissions(data.permissions || {});
        setTeamMentor(data.teamMentor || null);
      })
      .catch((err) => setError(err.message || "Unable to load team."))
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate("/signin");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const rows = editMode ? draft : lineup;
  const accent = franchise?.accent || "var(--accent)";

  function setRowRole(registrationId, squadRole) {
    setDraft((prev) =>
      prev.map((row) => {
        if (row.registrationId === registrationId) {
          return { ...row, squadRole };
        }
        if (squadRole === "captain" && row.squadRole === "captain") {
          return { ...row, squadRole: "player" };
        }
        if (squadRole === "vice_captain" && row.squadRole === "vice_captain") {
          return { ...row, squadRole: "player" };
        }
        return row;
      })
    );
  }

  function setRowPlayingRole(registrationId, playingRole) {
    setDraft((prev) =>
      prev.map((row) => (row.registrationId === registrationId ? { ...row, playingRole } : row))
    );
  }

  function onDrop(targetIndex) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    setDraft((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next.map((row, i) => ({ ...row, order: i + 1 }));
    });
    setDragIndex(null);
  }

  async function saveLineup() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await api("/api/registrations/team-lineup", {
        method: "PUT",
        body: JSON.stringify({
          entries: draft.map((row, i) => ({
            registrationId: row.registrationId,
            order: i + 1,
            squadRole: row.squadRole,
            playingRole: row.playingRole || row.player?.role || "",
          })),
        }),
      });
      setLineup(data.lineup || []);
      setDraft(data.lineup || []);
      setPermissions(data.permissions || permissions);
      setEditMode(false);
      setMessage("Team lineup saved.");
    } catch (err) {
      setError(err.message || "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) {
    return <section className="px-4 py-20 text-center text-[color:var(--text-muted)]">Loading...</section>;
  }

  return (
    <section className="bg-ink px-4 py-8 md:py-10">
      <div className="mx-auto max-w-2xl">
        <div
          className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-ink-card px-4 py-3"
          style={{ boxShadow: `inset 4px 0 0 ${accent}` }}
        >
          {franchise?.image ? (
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded bg-white">
              <FranchiseLogoMark
                team={findFranchise(franchise.id) || franchise}
                variant="thumb"
                className="h-full w-full"
              />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
              Playing squad
            </p>
            <h1 className="font-display text-lg text-[color:var(--title)]">{team?.name || "My team"}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <SquadRoleBadge role={permissions.mySquadRole} accent={accent} compact />
              {permissions.mySquadRole === "player" ? (
                <span className="text-xs text-[color:var(--text-muted)]">Squad member</span>
              ) : null}
              {permissions.mySquadRole === "vice_captain" ? (
                <span className="text-xs text-[color:var(--text-muted)]">View only</span>
              ) : null}
              {permissions.mySquadRole === "mentor" ? (
                <span className="text-xs text-[color:var(--text-muted)]">Team mentor · full lineup access</span>
              ) : null}
            </div>
          </div>
          <Link to="/dashboard" className="btn-ghost !py-1.5 !text-xs shrink-0">
            Dashboard
          </Link>
        </div>

        {permissions.canEdit ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {!editMode ? (
              <button type="button" className="btn-primary !py-2 !text-xs" onClick={() => setEditMode(true)}>
                Edit lineup
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-primary !py-2 !text-xs"
                  disabled={saving}
                  onClick={saveLineup}
                >
                  {saving ? "Saving…" : "Save lineup"}
                </button>
                <button
                  type="button"
                  className="btn-ghost !py-2 !text-xs"
                  disabled={saving}
                  onClick={() => {
                    setDraft(lineup);
                    setEditMode(false);
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        ) : permissions.mySquadRole === "vice_captain" ? (
          <p className="mt-4 text-sm text-[color:var(--text-muted)]">
            You can view the squad order. Only the team captain can make changes.
          </p>
        ) : null}

        {error ? <p className="mt-4 text-sm text-accent">{error}</p> : null}
        {message ? <p className="mt-4 text-sm text-emerald-300">{message}</p> : null}

        {busy ? (
          <p className="mt-8 text-sm text-[color:var(--text-muted)]">Loading squad…</p>
        ) : rows.length === 0 && !teamMentor ? (
          <p className="panel mt-8 rounded-2xl p-5 text-sm text-[color:var(--text-muted)]">
            No squad members yet.
          </p>
        ) : (
          <ul className="mt-6 space-y-2">
            {teamMentor ? (
              <li
                className="flex flex-col gap-2 rounded-lg border border-[color:var(--border)] bg-ink-soft/30 p-3 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase text-white"
                    style={{ background: `${accent}99` }}
                  >
                    M
                  </span>
                  {profileImageUrl(teamMentor) ? (
                    <ZoomableImage
                      src={profileImageUrl(teamMentor)}
                      alt={teamMentor.fullName || "Mentor"}
                      buttonClassName="h-10 w-10 shrink-0 overflow-hidden rounded-full"
                      className="h-10 w-10 object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-soft text-sm font-semibold text-accent">
                      {(teamMentor.fullName || "?").slice(0, 1)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-[color:var(--title)]">
                      <span>{teamMentor.fullName}</span>
                      <SquadRoleBadge role="mentor" accent={accent} compact />
                    </p>
                      <p className="text-xs text-[color:var(--text-muted)]">Team mentor</p>
                  </div>
                </div>
              </li>
            ) : null}
            {rows.map((row, index) => {
              const p = row.player || {};
              const photo = profileImageUrl(p);
              return (
                <li
                  key={row.registrationId}
                  draggable={editMode && permissions.canEdit}
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => editMode && e.preventDefault()}
                  onDrop={() => editMode && onDrop(index)}
                  className={`flex flex-col gap-2 rounded-lg border border-[color:var(--border)] bg-ink-card p-3 sm:flex-row sm:items-center ${
                    editMode ? "cursor-grab active:cursor-grabbing" : ""
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ background: `${accent}cc` }}
                    >
                      {index + 1}
                    </span>
                    {photo ? (
                      <ZoomableImage
                        src={photo}
                        alt={p.fullName || "Player"}
                        buttonClassName="h-10 w-10 shrink-0 overflow-hidden rounded-full"
                        className="h-10 w-10 object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-soft text-sm font-semibold text-accent">
                        {(p.fullName || "?").slice(0, 1)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-[color:var(--title)]">
                        <span>{p.fullName}</span>
                        <SquadRoleBadge role={row.squadRole} accent={accent} compact />
                      </p>
                      <p className="text-xs text-[color:var(--text-muted)]">
                        {p.playerCode ? `${p.playerCode} · ` : ""}
                        {playerRoleLabel(row.playingRole || p.role)}
                      </p>
                    </div>
                  </div>
                  {editMode && permissions.canEdit ? (
                    <div className="flex flex-wrap gap-1 sm:justify-end">
                      <select
                        className="input-dark !py-1 !text-xs"
                        value={row.playingRole || p.role || ""}
                        onChange={(e) => setRowPlayingRole(row.registrationId, e.target.value)}
                      >
                        {PLAYER_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="rounded-md border border-[color:var(--border)] px-2 py-1 text-[10px] font-semibold"
                        onClick={() => setRowRole(row.registrationId, "captain")}
                      >
                        Captain
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-[color:var(--border)] px-2 py-1 text-[10px] font-semibold"
                        onClick={() => setRowRole(row.registrationId, "vice_captain")}
                      >
                        Vice
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-[color:var(--border)] px-2 py-1 text-[10px] font-semibold"
                        onClick={() => setRowRole(row.registrationId, "player")}
                      >
                        Player
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
