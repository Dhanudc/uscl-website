import { useEffect, useState } from "react";
import { api } from "../api";
import { EmptyState, PageLoader } from "../components/ui";
import ZoomableImage from "../components/ZoomableImage";
import { useSiteSettings } from "../context/SiteSettingsContext";

function placeLabel(place) {
  const n = Number(place);
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function WinnerCard({ winner, featured = false }) {
  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-ink-card text-center ${
        featured ? "border-accent shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_35%,transparent)]" : "border-[color:var(--border)]"
      }`}
    >
      {winner.awardImage ? (
        <ZoomableImage
          src={winner.awardImage}
          alt={winner.name || "Reward"}
          buttonClassName="block w-full"
          className="aspect-square w-full object-cover"
        />
      ) : null}
      <div className="flex flex-1 flex-col items-center px-5 py-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{placeLabel(winner.place)}</p>
      {!winner.awardImage && winner.image ? (
        <ZoomableImage
          src={winner.image}
          alt={winner.name || "Winner"}
          buttonClassName="mt-4 h-28 w-28 overflow-hidden rounded-full border-2 border-accent/50"
          className="h-28 w-28 rounded-full object-cover"
        />
      ) : !winner.awardImage ? (
        <span className="mt-4 inline-flex h-28 w-28 items-center justify-center rounded-full border border-dashed border-[color:var(--border)] text-xs text-[color:var(--text-muted)]">
          Photo
        </span>
      ) : null}
      <h3 className="mt-4 font-display text-2xl leading-tight text-[color:var(--title)]">{winner.name}</h3>
      {winner.company ? (
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
          {winner.company}
        </p>
      ) : null}
      {winner.playerCode ? (
        <p className="mt-2 text-xs font-semibold text-accent">Player ID {winner.playerCode}</p>
      ) : null}
      <p className="mt-4 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white">{winner.gift}</p>
      </div>
    </article>
  );
}

function WinnerSection({ eyebrow, title, winners }) {
  const ranked = [...winners].sort((a, b) => Number(a.place) - Number(b.place));
  return (
    <section>
      <div className="mb-5">
        <p className="eyebrow text-accent">{eyebrow}</p>
        <h2 className="font-display mt-1 text-3xl text-[color:var(--title)]">{title}</h2>
      </div>
      {winners.length === 0 ? (
        <EmptyState title="Coming soon" description={`Winners for ${title.toLowerCase()} will appear here.`} />
      ) : (
        <div
          className={`grid items-stretch gap-4 ${
            ranked.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {ranked.map((winner) => (
            <WinnerCard
              key={`${winner.section}-${winner.place}-${winner.playerCode || winner.name}`}
              winner={winner}
              featured={Number(winner.place) === 1}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function Referrals() {
  const { isModuleVisible, loading: settingsLoading } = useSiteSettings();
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (settingsLoading || !isModuleVisible("referrals")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api("/api/settings")
      .then((data) => setChallenge(data.settings?.referralChallenge || null))
      .catch((err) => setError(err.message || "Unable to load winners."))
      .finally(() => setLoading(false));
  }, [settingsLoading, isModuleVisible]);

  if (settingsLoading || loading) {
    return (
      <section className="bg-ink px-4 py-10">
        <PageLoader message="Loading winners…" />
      </section>
    );
  }

  if (!isModuleVisible("referrals")) {
    return (
      <section className="bg-ink px-4 py-16 text-center">
        <EmptyState title="This page is hidden" description="An admin can turn Rewards back on from site settings." />
      </section>
    );
  }

  const winners = challenge?.winners || [];
  const referrals = winners.filter((row) => row.section !== "giveaway");
  const giveaways = winners.filter((row) => row.section === "giveaway");

  return (
    <section className="bg-ink px-4 py-10 md:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="eyebrow text-accent">USCL</p>
          <h1 className="page-title mt-2">{challenge?.title || "Winners Announcement"}</h1>
          {challenge?.subtitle ? (
            <p className="mx-auto mt-3 inline-block rounded-full bg-accent px-4 py-1 text-xs font-bold uppercase tracking-[0.16em] text-white">
              {challenge.subtitle}
            </p>
          ) : null}
        </div>

        {error ? <p className="mt-6 text-center text-sm text-accent">{error}</p> : null}

        <div className="mt-12 space-y-14">
          <WinnerSection eyebrow="Section 01" title="Referrals" winners={referrals} />
          <WinnerSection eyebrow="Section 02" title="Giveaways" winners={giveaways} />
        </div>

        <div className="mt-14 border-t border-[color:var(--border)] pt-8 text-center">
          {challenge?.thankYou ? (
            <p className="font-display text-xl text-[color:var(--title)]">{challenge.thankYou}</p>
          ) : null}
          {challenge?.supportLine ? (
            <p className="mt-2 text-sm text-[color:var(--text)]">{challenge.supportLine}</p>
          ) : null}
          {challenge?.closingLine ? (
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">{challenge.closingLine}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
