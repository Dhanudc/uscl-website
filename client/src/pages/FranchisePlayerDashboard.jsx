import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import ZoomableImage from "../components/ZoomableImage";
import { useAuth } from "../context/AuthContext";
import { playerRoleLabel } from "../data/playerRoles";
import { paymentScreenshotUrl, profileImageUrl } from "../utils/media";
import { getPaymentStatus, paymentStatusLabel } from "../utils/paymentStatus";

export default function FranchisePlayerDashboard() {
  const { playerId } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/signin");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user || !playerId) return;
    setBusy(true);
    api(`/api/registrations/squad/${playerId}`)
      .then((data) => setPlayer(data.player || null))
      .catch((err) => setError(err.message || "Unable to load player."))
      .finally(() => setBusy(false));
  }, [user, playerId]);

  if (loading || !user) {
    return <section className="px-4 py-20 text-center text-[color:var(--text-muted)]">Loading...</section>;
  }

  const photo = profileImageUrl(player);

  return (
    <section className="bg-ink px-4 py-8 md:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-accent">Player dashboard</p>
            <h1 className="page-title mt-1">{player?.fullName || "Player"}</h1>
          </div>
          <Link to="/dashboard/players" className="btn-ghost !py-2 !text-xs">
            Back to players list
          </Link>
        </div>

        {busy ? (
          <p className="mt-8 text-sm text-[color:var(--text-muted)]">Loading...</p>
        ) : error ? (
          <p className="mt-8 text-sm text-accent">{error}</p>
        ) : player ? (
          <div className="panel mt-8 rounded-2xl p-5">
            <div className="flex flex-wrap items-start gap-4">
              {photo ? (
                <ZoomableImage
                  src={photo}
                  alt={player.fullName}
                  className="h-24 w-24 rounded-lg border border-[color:var(--border)] object-cover"
                />
              ) : (
                <span className="inline-flex h-24 w-24 items-center justify-center rounded-lg border border-[color:var(--border)] bg-ink-soft text-sm text-[color:var(--text-muted)]">
                  No photo
                </span>
              )}
              <div className="grid min-w-0 flex-1 gap-1.5 text-sm text-[color:var(--text)] sm:grid-cols-2">
                <p>Name: {player.fullName}</p>
                <p>Email: {player.email}</p>
                <p>Phone: {player.phone}</p>
                <p>Company: {player.company}</p>
                <p>Role: {playerRoleLabel(player.role) || "—"}</p>
                <p>
                  Interest:{" "}
                  <strong className="uppercase text-accent-soft">{player.interest}</strong>
                </p>
                <p>
                  Payment:{" "}
                  <strong className="uppercase text-accent-soft">
                    {paymentStatusLabel(getPaymentStatus(player))}
                  </strong>
                </p>
                <p>
                  Auction:{" "}
                  <strong className="uppercase text-accent-soft">
                    {player.auctionStatus || "sold"}
                  </strong>
                </p>
                {player.franchiseName ? <p>Team: {player.franchiseName}</p> : null}
                {player.soldPrice ? <p>Sold: ₹{player.soldPrice}</p> : null}
                {player.utrNumber ? <p>UTR: {player.utrNumber}</p> : null}
                {paymentScreenshotUrl(player) ? (
                  <p className="sm:col-span-2">
                    Payment screenshot:{" "}
                    <a
                      href={paymentScreenshotUrl(player)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent-soft underline"
                    >
                      View
                    </a>
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
