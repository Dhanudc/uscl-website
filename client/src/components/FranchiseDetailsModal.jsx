import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import ZoomableImage from "./ZoomableImage";
import { playerRoleLabel } from "../data/playerRoles";
import { profileImageUrl } from "../utils/media";

export default function FranchiseDetailsModal({ team, onClose, showSquad = true }) {
  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [playersError, setPlayersError] = useState("");

  useEffect(() => {
    if (!showSquad || !team?.id) return undefined;

    let cancelled = false;
    setLoadingPlayers(true);
    setPlayersError("");
    api(`/api/teams/${team.id}/players`)
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
  }, [showSquad, team?.id]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!team) return null;

  const owner = team.owner;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="franchise-details-title"
        className="panel max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full" style={{ background: team.accent }} />
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-[color:var(--border)]">
              <img src={team.image} alt="" className="h-[88%] w-[88%] object-contain" />
            </span>
            <div className="min-w-0">
              <p className="eyebrow text-accent">Franchise details</p>
              <h2
                id="franchise-details-title"
                className="font-display mt-1 text-2xl text-[color:var(--title)]"
              >
                {team.name}
              </h2>
            </div>
          </div>
          <button type="button" className="btn-ghost !py-1.5 !text-xs" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto border-t border-[color:var(--border)] p-4">
          {owner ? (
            <div className={`flex items-center gap-3 rounded-lg border border-[color:var(--border)] p-3 ${showSquad ? "mb-4" : ""}`}>
              {profileImageUrl(owner) ? (
                <ZoomableImage
                  src={profileImageUrl(owner)}
                  alt={owner.fullName}
                  className="h-16 w-16 rounded-full border border-[color:var(--border)] object-cover"
                />
              ) : (
                <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-accent">
                  {(owner.fullName || "?").slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-[color:var(--text-muted)]">Owner</p>
                <p className="font-semibold text-[color:var(--title)]">{owner.fullName}</p>
                {owner.company ? (
                  <p className="text-sm text-[color:var(--text-muted)]">{owner.company}</p>
                ) : null}
                {owner.phone ? (
                  <p className="text-sm text-[color:var(--text-muted)]">{owner.phone}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className={`rounded-lg border border-[color:var(--border)] px-3 py-3 ${showSquad ? "mb-4" : ""}`}>
              <p className="text-sm text-[color:var(--text-muted)]">
                This franchise is still available to buy.
              </p>
              <Link to="/franchise" className="btn-primary mt-3 inline-flex !py-2 !text-xs">
                Buy Now →
              </Link>
            </div>
          )}

          {showSquad ? (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                Squad
              </p>
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
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
