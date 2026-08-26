/** Fixed portal media sections — admins cannot add or remove sections. */

export const MAX_IMAGES_PER_SECTION = 10;
export const MAX_VIDEOS_PER_SECTION = 1;

export const PORTAL_IMAGE_SECTIONS = [
  {
    id: "auction-night",
    title: "Auction Night",
    body: "Photos from the franchise auction desk and team unveil.",
  },
  {
    id: "league-stage",
    title: "League Stage",
    body: "Action from league fixtures across the season.",
  },
  {
    id: "grand-final",
    title: "Grand Final",
    body: "Finals night photos, celebrations, and trophy moments.",
  },
];

export const PORTAL_VIDEO_SECTIONS = [
  {
    id: "season-trailer",
    title: "Season trailer",
    body: "Official USCL T20 season trailer and launch film.",
  },
  {
    id: "franchise-unveil",
    title: "Franchise unveil",
    body: "Franchise branding and team announcement coverage.",
  },
  {
    id: "player-journey",
    title: "Player journey film",
    body: "Stories from registration through auction to match day.",
  },
];

const IMAGE_IDS = new Set(PORTAL_IMAGE_SECTIONS.map((s) => s.id));
const VIDEO_IDS = new Set(PORTAL_VIDEO_SECTIONS.map((s) => s.id));

export function isValidImageSectionId(sectionId) {
  return IMAGE_IDS.has(String(sectionId || "").trim());
}

export function isValidVideoSectionId(sectionId) {
  return VIDEO_IDS.has(String(sectionId || "").trim());
}
