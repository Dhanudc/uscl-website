import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { franchises } from "../data/franchises";
import { playerRoleLabel } from "../data/playerRoles";
import ZoomableImage from "./ZoomableImage";

function franchiseMeta(franchiseId) {
  return franchises.find((f) => f.id === franchiseId) || null;
}

function formatInr(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function RankBadge({ rank, tied }) {
  const tone =
    rank === 1
      ? "auction-top-sold__rank auction-top-sold__rank--gold"
      : rank === 2
        ? "auction-top-sold__rank auction-top-sold__rank--silver"
        : rank === 3
          ? "auction-top-sold__rank auction-top-sold__rank--bronze"
          : "auction-top-sold__rank";
  const label = tied ? `Price tier ${rank} (tied)` : `Price tier ${rank}`;
  return (
    <span className={tone} aria-label={label} title={tied ? "Same hammer price" : undefined}>
      #{rank}
      {tied ? <span className="auction-top-sold__rank-tie" aria-hidden="true">T</span> : null}
    </span>
  );
}

function PlayerAvatar({ player, accent, featured }) {
  const src = player.profileImageUrl;
  if (src) {
    return (
      <ZoomableImage
        src={src}
        alt={player.fullName || "Player photo"}
        portraitCrop
        className={`auction-top-sold__avatar ${featured ? "auction-top-sold__avatar--featured-img" : ""}`}
        buttonClassName="auction-top-sold__avatar-btn"
        imgStyle={{ boxShadow: `0 0 0 2px ${accent}55` }}
      />
    );
  }
  return (
    <span
      className="auction-top-sold__avatar auction-top-sold__avatar--fallback"
      style={{ borderColor: accent, color: accent }}
    >
      {(player.fullName || "?").slice(0, 1)}
    </span>
  );
}

function SoldCard({ player, rank, tied = false, featured = false }) {
  const team = franchiseMeta(player.franchiseId);
  const accent = team?.accent || "var(--accent)";
  const role = playerRoleLabel(player.role);
  const isCompact = !featured && rank > 1;

  return (
    <article
      className={`auction-top-sold__card ${featured ? "auction-top-sold__card--featured" : ""} ${isCompact ? "auction-top-sold__card--compact" : ""}`}
      style={{ "--sold-accent": accent }}
    >
      <div className="auction-top-sold__card-glow" aria-hidden="true" />
      <div className="auction-top-sold__card-inner">
        <div className="auction-top-sold__card-head">
          <RankBadge rank={rank} tied={tied} />
          <PlayerAvatar player={player} accent={accent} featured={featured} />
        </div>
        <div className="auction-top-sold__card-body">
          <h3 className="auction-top-sold__name">{player.fullName}</h3>
          {player.playerCode || role ? (
            <p className="auction-top-sold__meta">
              {player.playerCode ? `ID ${player.playerCode}` : ""}
              {player.playerCode && role ? " · " : ""}
              {role}
            </p>
          ) : null}
          <p className="auction-top-sold__price">{formatInr(player.soldPrice)}</p>
          <div className="auction-top-sold__team">
            {team?.image ? (
              <span className="auction-top-sold__team-logo-wrap">
                <img src={team.image} alt="" className="auction-top-sold__team-logo" loading="lazy" />
              </span>
            ) : null}
            <span className="auction-top-sold__team-name">
              {player.franchiseName || team?.name || "Franchise"}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AuctionTopSoldStrip() {
  const { auctionTopSoldPriceTiers } = useSiteSettings();
  const tierCount = Math.min(20, Math.max(1, Number(auctionTopSoldPriceTiers) || 5));
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api(`/api/auction/top-sold?limit=${tierCount}`)
      .then((data) => {
        if (cancelled) return;
        setPlayers(Array.isArray(data.players) ? data.players : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Unable to load top sales.");
        setPlayers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tierCount]);

  if (loading) {
    return (
      <div className="auction-top-sold mt-12">
        <p className="eyebrow text-accent">Top hammer prices</p>
        <div className="auction-top-sold__grid auction-top-sold__grid--loading">
          {Array.from({ length: Math.min(5, tierCount) }, (_, i) => i + 1).map((i) => (
            <div key={i} className="auction-top-sold__skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (error || players.length === 0) {
    return (
      <div className="auction-top-sold mt-12">
        <p className="eyebrow text-accent">Top hammer prices</p>
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          {error || "Top sales will appear here as players are sold at the auction."}
        </p>
      </div>
    );
  }

  const rankOf = (p) => Number(p.priceRank) || 0;
  const tieAtRank = (rank) => players.filter((p) => rankOf(p) === rank).length > 1;

  const tierOne = players.filter((p) => rankOf(p) === 1);
  const rest = players.filter((p) => rankOf(p) > 1);

  const cardKey = (player, i) =>
    `${player.playerCode || player.fullName}-${player.soldPrice}-${i}`;

  return (
    <div className="auction-top-sold mt-12">
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between sm:gap-4">
        <div className="text-center sm:text-left">
          <p className="eyebrow text-accent">Top hammer prices</p>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Top {tierCount} bid amounts — all players at each price shown
          </p>
        </div>
        <Link to="/franchises" className="btn-ghost !py-2 !text-xs">
          View all teams →
        </Link>
      </div>

      <div
        className={`auction-top-sold__layout mt-8 ${tierOne.length > 1 ? "auction-top-sold__layout--many-top" : ""}`}
      >
        {tierOne.length > 0 ? (
          <div
            className={`auction-top-sold__featured-wrap ${tierOne.length > 1 ? "auction-top-sold__featured-wrap--multi" : ""}`}
          >
            {tierOne.map((player, i) => (
              <SoldCard
                key={cardKey(player, i)}
                player={player}
                rank={1}
                tied={tieAtRank(1)}
                featured={tierOne.length === 1}
              />
            ))}
          </div>
        ) : null}
        {rest.length > 0 ? (
          <div className="auction-top-sold__grid">
            {rest.map((player, i) => {
              const rank = rankOf(player);
              return (
                <SoldCard
                  key={cardKey(player, i)}
                  player={player}
                  rank={rank}
                  tied={tieAtRank(rank)}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
