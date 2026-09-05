import { useEffect, useState } from "react";
import { api } from "../api";
import { franchises } from "../data/franchises";
import FranchiseDetailsModal from "./FranchiseDetailsModal";

/** Display order matching the hanging-banner artwork */
const BANNER_ORDER = [
  "new-jersey-jaguars",
  "florida-falcons",
  "chicago-crushers",
  "virginia-vikings",
  "california-chargers",
  "texas-thunder",
  "new-york-knights",
  "arizona-avengers",
];

const TILTS = [-1.8, 1.3, -1.0, 1.7, -1.5, 1.1, -0.8, 1.9];

export default function HeroFranchiseBanners() {
  const banners = BANNER_ORDER.map((id) => franchises.find((f) => f.id === id)).filter(Boolean);
  const rows = [banners.slice(0, 4), banners.slice(4, 8)];
  const [ownersByTeam, setOwnersByTeam] = useState({});
  const [selectedTeam, setSelectedTeam] = useState(null);

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
    <>
      <div className="hero-banners relative w-full" aria-label="USCL franchises">
        <div className="flex flex-col gap-4 sm:gap-7">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="relative pt-1">
              <div className="pennant-rail mx-[3%] mb-0.5" aria-hidden="true" />
              <div className="grid grid-cols-4 gap-1 sm:gap-2.5 md:gap-3">
                {row.map((team, colIndex) => {
                  const index = rowIndex * 4 + colIndex;
                  const owner = ownersByTeam[team.id];
                  return (
                    <button
                      key={team.id}
                      type="button"
                      className="hero-pennant group relative mx-auto block w-full max-w-[5.5rem] origin-top sm:max-w-[6.5rem] md:max-w-[7.5rem]"
                      style={{
                        animationDelay: `${index * 70}ms`,
                        "--pennant-tilt": `${TILTS[index]}deg`,
                      }}
                      title={`${team.name} details`}
                      aria-label={`${team.name} franchise details`}
                      onClick={() => setSelectedTeam({ ...team, owner })}
                    >
                      <span className="absolute left-[38%] top-[7px] z-0 h-3 w-px bg-[#6a6a6a]" />
                      <span className="absolute right-[38%] top-[7px] z-0 h-3 w-px bg-[#6a6a6a]" />
                      <span className="pennant-pin absolute left-1/2 top-0 z-10 h-2.5 w-2.5 -translate-x-1/2 rounded-full" />
                      <span
                        className="pennant-cloth relative mt-3 flex aspect-[3/5] w-full flex-col items-center overflow-hidden px-1.5 pb-5 pt-3"
                        style={{
                          background: `linear-gradient(180deg, color-mix(in srgb, ${team.accent} 92%, #fff) 0%, ${team.accent} 42%, color-mix(in srgb, ${team.accent} 62%, #000) 100%)`,
                          clipPath: "polygon(0 0, 100% 0, 100% 84%, 50% 100%, 0 84%)",
                        }}
                      >
                        <span className="pennant-sheen pointer-events-none absolute inset-0" />
                        <span className="relative mt-1 flex h-[52%] w-[82%] items-center justify-center overflow-hidden rounded-full bg-[#f7f3ea] shadow-[inset_0_1px_2px_rgba(0,0,0,.18)] ring-2 ring-white/35">
                          <img
                            src={team.image}
                            alt=""
                            className="h-[90%] w-[90%] object-contain"
                            loading="lazy"
                          />
                        </span>
                        <span className="font-display relative mt-1.5 max-w-full truncate px-0.5 text-[0.62rem] leading-tight tracking-wide text-white drop-shadow-sm sm:text-[0.7rem]">
                          {team.shortName}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      {selectedTeam ? (
        <FranchiseDetailsModal
          team={selectedTeam}
          showSquad={false}
          onClose={() => setSelectedTeam(null)}
        />
      ) : null}
    </>
  );
}
