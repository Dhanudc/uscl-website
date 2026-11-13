import { useEffect, useState } from "react";
import { api } from "../api";
import { franchises, franchiseLocationLabel } from "../data/franchises";
import {
  SPONSOR_PENNANT_INTERVAL_MS,
  TITLE_SPONSOR_NAME,
  USCL_PRIMARY_LOGO,
} from "../data/brandAssets";
import { franchiseLogoDisplay, franchiseLogoSrc } from "../utils/franchiseLogoDisplay";
import FranchiseDetailsModal from "./FranchiseDetailsModal";
import SponsorDetailsModal from "./SponsorDetailsModal";
import ZoomableImage from "./ZoomableImage";

/** Display order matching the hanging-banner artwork */
const BANNER_ORDER = [
  "virginia-vikings",
  "florida-falcons",
  "chicago-crushers",
  "norwin-atlanta-lions",
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
  const [sponsorOpen, setSponsorOpen] = useState(false);
  const [spotlight, setSpotlight] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setSpotlight((i) => (i + 1) % banners.length),
      SPONSOR_PENNANT_INTERVAL_MS
    );
    return () => clearInterval(id);
  }, [banners.length]);

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

  function onPennantActivate(team, owner, isSponsorView) {
    if (isSponsorView) {
      setSponsorOpen(true);
      return;
    }
    setSelectedTeam({ ...team, owner });
  }

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
                  const logoDisplay = franchiseLogoDisplay(team.id);
                  const isSpotlight = index === spotlight;
                  const isSponsorView = isSpotlight;
                  const pennantClass = `hero-pennant group relative mx-auto w-full max-w-[5.5rem] origin-top transition-[transform,opacity] duration-300 sm:max-w-[6.5rem] md:max-w-[7.5rem] ${
                    isSpotlight
                      ? "hero-pennant--spotlight z-[2] scale-[1.06] opacity-100"
                      : "scale-[0.94] opacity-[0.55]"
                  }`;
                  const clothStyle = {
                    background: `linear-gradient(180deg, color-mix(in srgb, ${team.accent} 92%, #fff) 0%, ${team.accent} 42%, color-mix(in srgb, ${team.accent} 62%, #000) 100%)`,
                    clipPath: "polygon(0 0, 100% 0, 100% 84%, 50% 100%, 0 84%)",
                  };

                  return (
                    <div
                      key={team.id}
                      className={pennantClass}
                      style={{
                        animationDelay: `${index * 70}ms`,
                        "--pennant-tilt": `${TILTS[index]}deg`,
                      }}
                    >
                      <span className="absolute left-[38%] top-[7px] z-0 h-3 w-px bg-[#6a6a6a]" />
                      <span className="absolute right-[38%] top-[7px] z-0 h-3 w-px bg-[#6a6a6a]" />
                      <span className="pennant-pin absolute left-1/2 top-0 z-10 h-2.5 w-2.5 -translate-x-1/2 rounded-full" />
                      <div
                        role="button"
                        tabIndex={0}
                        className="pennant-cloth relative mt-3 flex aspect-[3/5] w-full cursor-pointer flex-col items-center overflow-hidden px-1.5 pb-5 pt-3"
                        style={clothStyle}
                        title={isSponsorView ? `${TITLE_SPONSOR_NAME} details` : `${team.name} details`}
                        aria-label={
                          isSponsorView
                            ? `${TITLE_SPONSOR_NAME} title sponsor details`
                            : `${team.name} franchise details`
                        }
                        onClick={() => onPennantActivate(team, owner, isSponsorView)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onPennantActivate(team, owner, isSponsorView);
                          }
                        }}
                      >
                        <span className="pennant-sheen pointer-events-none absolute inset-0" />
                        <span
                          className="relative mt-1 flex h-[52%] w-[82%] items-center justify-center overflow-hidden rounded-full bg-[#f7f3ea] shadow-[inset_0_1px_2px_rgba(0,0,0,.18)] ring-2 ring-white/35"
                          onClick={isSponsorView ? (e) => e.stopPropagation() : undefined}
                        >
                          {isSponsorView ? (
                            <ZoomableImage
                              src={USCL_PRIMARY_LOGO}
                              alt={TITLE_SPONSOR_NAME}
                              portraitCrop={false}
                              buttonClassName="flex h-[88%] w-[88%] items-center justify-center rounded-full"
                              className="h-full w-full object-contain object-center"
                              sizeClass="max-h-[min(92vh,720px)] max-w-[min(94vw,420px)]"
                            />
                          ) : (
                            <img
                              src={franchiseLogoSrc(team, "pennant")}
                              alt=""
                              className="h-[90%] w-[90%] object-contain object-center"
                              style={{ transform: `scale(${logoDisplay.pennantScale})` }}
                              loading={index < 4 ? "eager" : "lazy"}
                            />
                          )}
                        </span>
                        <span className="font-display relative mt-1.5 max-w-full truncate px-0.5 text-[0.62rem] leading-tight tracking-wide text-white drop-shadow-sm transition-opacity duration-200 sm:text-[0.7rem]">
                          {isSponsorView ? TITLE_SPONSOR_NAME : franchiseLocationLabel(team)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center gap-1.5" aria-hidden="true">
          {banners.map((team, i) => (
            <span
              key={team.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === spotlight ? "w-6 bg-accent" : "w-1.5 bg-[color:var(--border-strong)]"
              }`}
            />
          ))}
        </div>
      </div>
      {sponsorOpen ? <SponsorDetailsModal onClose={() => setSponsorOpen(false)} /> : null}
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
