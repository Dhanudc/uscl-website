import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { playerRoleLabel } from "../data/playerRoles";
import { profileImageUrl } from "../utils/media";

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
    <section className="bg-ink px-4 py-8 md:py-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-accent">Franchise squad</p>
            <h1 className="page-title mt-1">{team?.name || "Players list"}</h1>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Players bought for your franchise. Click a profile to open their dashboard.
            </p>
          </div>
          <Link to="/dashboard" className="btn-ghost !py-2 !text-xs">
            Back to dashboard
          </Link>
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
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {players.map((p) => {
              const photo = profileImageUrl(p);
              return (
                <Link
                  key={p._id}
                  to={`/dashboard/player/${p._id}`}
                  className="panel flex items-center gap-3 rounded-2xl p-4 transition hover:border-accent"
                >
                  {photo ? (
                    <img
                      src={photo}
                      alt={p.fullName}
                      className="h-14 w-14 shrink-0 rounded-full border border-[color:var(--border)] object-cover"
                    />
                  ) : (
                    <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/15 font-semibold text-accent">
                      {(p.fullName || "?").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-[color:var(--title)]">{p.fullName}</p>
                    <p className="truncate text-sm text-[color:var(--text-muted)]">
                      {playerRoleLabel(p.role) || p.interest}
                      {p.company ? ` · ${p.company}` : ""}
                    </p>
                    {p.soldPrice ? (
                      <p className="mt-1 text-xs font-semibold text-accent">Sold ₹{p.soldPrice}</p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
