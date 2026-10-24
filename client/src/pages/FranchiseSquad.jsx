import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { playerRoleLabel } from "../data/playerRoles";
import ZoomableImage from "../components/ZoomableImage";
import { profileImageUrl } from "../utils/media";

function PlayerAvatar({ player }) {
  const photo = profileImageUrl(player);
  if (!photo) {
    return (
      <span
        className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[color:var(--border)] bg-accent/15 text-lg font-semibold text-accent"
        aria-hidden="true"
      >
        {(player.fullName || "?").slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    <ZoomableImage
      src={photo}
      alt={player.fullName}
      portraitCrop
      buttonClassName="franchise-squad-avatar-btn"
      className="h-full w-full object-cover"
    />
  );
}

export default function FranchiseSquad() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/signin");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setBusy(true);
    api("/api/registrations/squad")
      .then((data) => {
        setTeam(data.team || null);
        setPlayers(data.players || []);
      })
      .catch((err) => setError(err.message || "Unable to load players."))
      .finally(() => setBusy(false));
  }, [user]);

  if (loading || !user) {
    return <section className="px-4 py-20 text-center text-[color:var(--text-muted)]">Loading...</section>;
  }

  return (
    <section className="bg-ink overflow-x-hidden px-4 py-8 md:py-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow text-accent">Franchise squad</p>
            <h1 className="page-title mt-1 break-words">{team?.name || "Players list"}</h1>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Tap a player for details. Tap their photo to view the full image.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link to="/dashboard/team" className="btn-primary w-full justify-center !py-2 !text-xs sm:w-auto">
              Team squad
            </Link>
            <Link to="/dashboard" className="btn-ghost w-full justify-center !py-2 !text-xs sm:w-auto">
              Back to dashboard
            </Link>
          </div>
        </div>

        {busy ? (
          <p className="mt-8 text-sm text-[color:var(--text-muted)]">Loading players...</p>
        ) : error ? (
          <p className="mt-8 text-sm text-accent">{error}</p>
        ) : players.length === 0 ? (
          <p className="panel mt-8 rounded-2xl p-5 text-sm text-[color:var(--text-muted)]">
            No bought players yet.
          </p>
        ) : (
          <ul className="mt-8 grid list-none grid-cols-1 gap-3 sm:grid-cols-2">
            {players.map((p) => (
              <li key={p._id} className="min-w-0">
                <article className="panel flex min-w-0 items-center gap-3 rounded-2xl p-3 sm:gap-4 sm:p-4">
                  <PlayerAvatar player={p} />
                  <Link
                    to={`/dashboard/player/${p._id}`}
                    className="min-w-0 flex-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <p className="font-semibold leading-snug text-[color:var(--title)] break-words">
                      {p.fullName}
                    </p>
                    {p.playerCode ? (
                      <p className="mt-0.5 text-xs font-semibold text-accent">ID: {p.playerCode}</p>
                    ) : null}
                    <p className="mt-1 line-clamp-2 text-sm leading-snug text-[color:var(--text-muted)]">
                      {playerRoleLabel(p.role) || p.interest}
                      {p.company ? ` · ${p.company}` : ""}
                    </p>
                    {p.soldPrice ? (
                      <p className="mt-1.5 text-xs font-semibold text-accent">
                        Sold ₹{Number(p.soldPrice).toLocaleString("en-IN")}
                      </p>
                    ) : null}
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
