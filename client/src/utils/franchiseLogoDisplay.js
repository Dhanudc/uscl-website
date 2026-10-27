/** Optional per-franchise grid tuning; defaults match most teams after normalized assets. */
const FRANCHISE_LOGO_DISPLAY = {
  "texas-thunder": {
    ribbonScale: 0.76,
    pennantScale: 0.92,
  },
  "norwin-atlanta-lions": {
    pennantScale: 1,
    ribbonScale: 1,
    teamCardLogoHeight: 200,
    teamCardLogoZoom: 1,
  },
};

const DEFAULT = {
  scale: 1,
  pad: 24,
  pennantScale: 1,
  ribbonScale: 1,
  teamCardLogoHeight: 200,
  teamCardLogoZoom: 1,
  teamCardPlateBackground: "#ffffff",
  teamCardPlateBorder: undefined,
  gridInnerPlateBackground: undefined,
  gridInnerPlateSize: "74%",
  gridInnerPlateZoom: 1,
  gridInnerPlatePad: 24,
};

export function franchiseLogoDisplay(franchiseId) {
  return FRANCHISE_LOGO_DISPLAY[franchiseId] || DEFAULT;
}

/** Full crest for large UI; optional `imageSm` for pennant, ribbon, and thumbs. */
export function franchiseLogoSrc(team, variant = "inline") {
  if (!team?.image) return "";
  const compact =
    team.imageSm &&
    (variant === "ribbon" || variant === "thumb" || variant === "pennant");
  return compact ? team.imageSm : team.image;
}

/** Centered black matte on white — Texas-style logo footprint per surface. */
export function franchiseLogoPlateConfig(team, variant = "grid") {
  if (!team?.logoInnerPlateBackground) return null;
  const d = franchiseLogoDisplay(team.id);
  const sizeByVariant = {
    grid: team.logoInnerPlateSizePercent ?? 74,
    pennant: 86,
    ribbon: 80,
    thumb: 78,
    modal: 82,
    inline: team.logoInnerPlateSizePercent ?? 74,
  };
  const zoomByVariant = {
    grid: d.gridInnerPlateZoom ?? 1.72,
    pennant: d.pennantInnerPlateZoom ?? 1.55,
    ribbon: d.ribbonInnerPlateZoom ?? 1.48,
    thumb: d.gridInnerPlateZoom ?? 1.72,
    modal: d.modalInnerPlateZoom ?? 1.42,
    inline: d.gridInnerPlateZoom ?? 1.72,
  };
  return {
    background: team.logoInnerPlateBackground,
    sizePercent: sizeByVariant[variant] ?? 74,
    zoom: zoomByVariant[variant] ?? 1,
    padding: d.gridInnerPlatePad ?? 8,
  };
}
