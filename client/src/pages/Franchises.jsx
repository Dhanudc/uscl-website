import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import PageShell from "../components/PageShell";
import { franchises } from "../data/franchises";
import { playerRoleLabel } from "../data/playerRoles";
import { profileImageUrl } from "../utils/media";

export default function Franchises() {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [playersError, setPlayersError] = useState("");

  useEffect(() => {
    if (!selectedTeam) {
      setPlayers([]);
      setPlayersError("");
      return;
    }

    let cancelled = false;
    setLoadingPlayers(true);
    setPlayersError("");
    api(`/api/teams/${selectedTeam.id}/players`)
      .then((data) => {
        if (cancelled) return;
        setPlayers(data.players || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setPlayers([]);
        setPlayersError(err.message || "Unable to load players.");
      })
      .finally(() => {
        if (!cancelled) setLoadingPlayers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTeam]);

  useEffect(() => {
    if (!selectedTeam) return undefined;
    function onKey(e) {
      if (e.key === "Escape") setSelectedTeam(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedTeam]);

  return (
    <PageShell
      eyebrow="Franchise Team"
      title="8 Franchises"
      subtitle="Official USCL team identities for Season 2026. Explore logos and claim available ownership slots."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {franchises.map((team, index) => (
          <article
            key={team.id}
            className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-ink-card"
          >
            <div className="aspect-square bg-white p-3">
              <img src={team.image} alt={team.name} className="h-full w-full object-contain" />
            </div>
            <div className="px-3 py-3" style={{ boxShadow: `inset 3px 0 0 ${team.accent}` }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                {team.city}
              </p>
              <button
                type="button"
                className="font-display mt-0.5 block w-full text-left text-lg text-[color:var(--title)] transition hover:text-accent"
                onClick={() => setSelectedTeam(team)}
              >
                {team.name}
              </button>
              {index < 3 ? (
                <Link
                  to="/franchise"
                  className="mt-2 inline-flex text-xs font-bold uppercase tracking-wide text-accent"
                >
                  Buy Now
                </Link>
              ) : (
                <p className="mt-2 text-xs text-[color:var(--text-muted)]">Season roster locked</p>
              )}
            </div>
          </article>
        ))}
      </div>

      {selectedTeam ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4"
          onClick={() => setSelectedTeam(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-players-title"
            className="panel max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4">
              <div className="min-w-0">
                <p className="eyebrow text-accent">{selectedTeam.city}</p>
                <h2
                  id="team-players-title"
                  className="font-display mt-1 text-2xl text-[color:var(--title)]"
                >
                  {selectedTeam.name}
                </h2>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  Sold players roster
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost !py-1.5 !text-xs"
                onClick={() => setSelectedTeam(null)}
              >
                Close
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              {loadingPlayers ? (
                <p className="text-sm text-[color:var(--text-muted)]">Loading players...</p>
              ) : playersError ? (
                <p className="text-sm text-accent">{playersError}</p>
              ) : players.length === 0 ? (
                <p className="text-sm text-[color:var(--text-muted)]">
                  No players assigned to this team yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {players.map((p) => {
                    const photo = profileImageUrl(p);
                    return (
                      <article
                        key={p._id}
                        className="flex items-center gap-3 rounded-md border border-[color:var(--border)] px-3 py-2.5"
                      >
                        {photo ? (
                          <img
                            src={photo}
                            alt={p.fullName}
                            className="h-11 w-11 shrink-0 rounded-full border border-[color:var(--border)] object-cover bg-ink-soft"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                            {(p.fullName || "?").slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[color:var(--title)]">{p.fullName}</p>
                          <p className="truncate text-xs text-[color:var(--text-muted)]">
                            {playerRoleLabel(p.role) || "Player"}
                            {p.company ? ` · ${p.company}` : ""}
                          </p>
                        </div>
                        {p.soldPrice ? (
                          <p className="text-xs font-semibold text-accent">₹{p.soldPrice}</p>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
