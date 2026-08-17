import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import FranchiseDetailsModal from "../components/FranchiseDetailsModal";
import PageShell from "../components/PageShell";
import ZoomableImage from "../components/ZoomableImage";
import { franchises } from "../data/franchises";
import { profileImageUrl } from "../utils/media";

export default function Franchises() {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [ownersByTeam, setOwnersByTeam] = useState({});

  useEffect(() => {
    api("/api/teams")
      .then((data) => {
        const map = {};
        for (const team of data.teams || []) {
          if (team.owner) map[team.id] = team.owner;
        }
        setOwnersByTeam(map);
      })
      .catch(() => {});
  }, []);

  return (
    <PageShell
      eyebrow="Franchise Team"
      title="8 Franchises"
      subtitle="Official USCL team identities for Season 2026. Explore logos and claim available ownership slots."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {franchises.map((team) => {
          const owner = ownersByTeam[team.id];
          return (
          <article
            key={team.id}
            className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-ink-card"
          >
            <button
              type="button"
              className="aspect-square w-full bg-white p-3"
              onClick={() => setSelectedTeam({ ...team, owner })}
              aria-label={`${team.name} franchise details`}
            >
              <img src={team.image} alt="" className="h-full w-full object-contain" />
            </button>
            <div className="px-3 py-3 text-center" style={{ boxShadow: `inset 3px 0 0 ${team.accent}` }}>
              <button
                type="button"
                className="font-display block w-full text-center text-lg text-[color:var(--title)] transition hover:text-accent"
                onClick={() => setSelectedTeam({ ...team, owner })}
              >
                {team.name}
              </button>
              {owner ? (
                <div className="mt-3 flex flex-col items-center gap-2">
                  {profileImageUrl(owner) ? (
                    <ZoomableImage
                      src={profileImageUrl(owner)}
                      alt={owner.fullName}
                      className="h-12 w-12 rounded-full border border-[color:var(--border)] object-cover"
                    />
                  ) : null}
                  <p className="text-sm font-semibold text-[color:var(--title)]">{owner.fullName}</p>
                  {owner.company ? (
                    <p className="text-xs text-[color:var(--text-muted)]">{owner.company}</p>
                  ) : null}
                </div>
              ) : (
                <Link
                  to="/franchise"
                  className="btn-primary mt-3 inline-flex w-full max-w-[11rem] justify-center !py-2 !text-xs sm:w-auto sm:min-w-[7.5rem]"
                >
                  Buy Now →
                </Link>
              )}
            </div>
          </article>
          );
        })}
      </div>

      {selectedTeam ? (
        <FranchiseDetailsModal team={selectedTeam} onClose={() => setSelectedTeam(null)} />
      ) : null}
    </PageShell>
  );
}
