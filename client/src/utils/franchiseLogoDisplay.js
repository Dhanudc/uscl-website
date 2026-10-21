/** Optional per-franchise grid tuning; defaults match most teams after normalized assets. */
const FRANCHISE_LOGO_DISPLAY = {};

const DEFAULT = { scale: 1, pad: 24 };

export function franchiseLogoDisplay(franchiseId) {
  return FRANCHISE_LOGO_DISPLAY[franchiseId] || DEFAULT;
}
