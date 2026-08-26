export const siteStats = [
  { value: "8", label: "franchises" },
  { value: "31", label: "matches" },
  { value: "16", label: "days" },
  { value: "1 Cr", label: "prize pool" },
  { value: "500+", label: "players" },
  { value: "100+", label: "companies" },
];

export const aboutSections = [
  {
    id: "vision",
    title: "Our vision",
    image:
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1400&q=80",
    paragraphs: [
      "At USCL, our goal is to build India's most celebrated staffing industry cricket league — where competition, culture, and community meet on the field. We create a national T20 stage that connects players, franchise owners, and partners from 100+ companies.",
      "Every franchise and player has a unique journey, and the league should reflect that. From registration and auction to league matches and the award ceremony, we want a premium format, lasting professional networks, and a human touch throughout the season.",
    ],
  },
  {
    id: "mission",
    title: "Mission",
    body: "Unite staffing professionals through elite franchise cricket, live auctions, and lasting business relationships across companies and cities.",
  },
  {
    id: "why",
    title: "Why USCL?",
    body: "A premium T20 format built for the staffing ecosystem — high-intensity matches, national visibility, and networking that lasts beyond the final.",
  },
  {
    id: "format",
    title: "League Format",
    body: "8 franchises compete across a league stage, knockouts, semi-finals, and a grand final — 31 matches over 16 days with a ₹1 Cr prize pool.",
  },
  {
    id: "members",
    title: "Members",
    body: "Players, franchise owners, sponsors, and partners from 100+ companies shaping the USCL community every season.",
  },
];

export const boardMembers = [
  {
    id: "sameer",
    name: "Sameer Penakalapati",
    role: "Ceipal CEO | Entrepreneur",
    image: "https://i.pravatar.cc/320?img=12",
    summary:
      "Sameer is a serial entrepreneur and the driving force behind Ceipal. He brings vision, energy, and a passion for building platforms that connect people.",
    bio: "Sameer Penakalapati is a serial entrepreneur and the driving force behind Ceipal. He has built products used by staffing firms worldwide and is a strong advocate for community cricket. At USCL he helps shape the league vision, franchise model, and industry partnerships so players and owners get a premium T20 stage.",
  },
  {
    id: "ananya",
    name: "Ananya Reddy",
    role: "League Director | Operations",
    image: "https://i.pravatar.cc/320?img=32",
    summary:
      "Ananya leads tournament operations — from registration and verification to match-day execution across the 16-day season.",
    bio: "Ananya Reddy oversees USCL operations end to end. She coordinates player registration, physical verification, auction logistics, and match-day workflows. Her focus is a fair, professional player journey so every franchise and athlete knows what happens next.",
  },
  {
    id: "rahul",
    name: "Rahul Mehta",
    role: "Commercial Head | Partnerships",
    image: "https://i.pravatar.cc/320?img=15",
    summary:
      "Rahul manages franchise ownership, sponsorships, and brand partnerships that power the ₹1 Cr prize pool.",
    bio: "Rahul Mehta leads commercial strategy for USCL. He works with franchise owners, title sponsors, and associate partners to fund the prize pool and keep the league sustainable. He also supports owner hospitality and on-ground brand visibility.",
  },
  {
    id: "priya",
    name: "Priya Nair",
    role: "Community Lead | Player Experience",
    image: "https://i.pravatar.cc/320?img=47",
    summary:
      "Priya looks after player experience, awards, and the community that connects 500+ players from 100+ companies.",
    bio: "Priya Nair is the community lead for USCL. She works on player cards, awards, and season communications so every participant feels part of the league. She also helps run the award ceremony and player-facing updates throughout the tournament.",
  },
];

export const playerJourney = [
  "Player Registration",
  "Payment",
  "Physical Verification",
  "Player Card",
  "Player Auction",
  "Franchise Selection",
  "League Matches",
  "Semi Final",
  "Final",
  "Award Ceremony",
];

export const sponsorPackages = [
  {
    id: "title",
    title: "Title Sponsor",
    price: "₹25L",
    blurb: "Lead the season with maximum brand presence across matches, media, and digital surfaces.",
    benefits: [
      "Title naming rights",
      "Main stage & broadcast branding",
      "Opening & closing ceremony presence",
      "Premium digital & social package",
    ],
  },
  {
    id: "co",
    title: "Co-Sponsor",
    price: "₹15L",
    blurb: "Share the spotlight across fixtures, auctions, and league communications.",
    benefits: [
      "Co-branding on key assets",
      "On-ground visibility",
      "Auction desk branding",
      "Social media features",
    ],
  },
  {
    id: "powered",
    title: "Powered By",
    price: "₹10L",
    blurb: "Power the league experience across player journey and fan touchpoints.",
    benefits: [
      "Powered-by lockup",
      "Player kit / digital badges",
      "Highlight reel mentions",
      "Newsletter placement",
    ],
  },
  {
    id: "associate",
    title: "Associate Sponsors",
    price: "₹3L",
    blurb: "Associate your brand with India's biggest staffing franchise cricket league.",
    benefits: [
      "Logo on associate wall",
      "Website listing",
      "Social shout-outs",
      "Networking access",
    ],
  },
];

export const tournamentPartners = ["Partner", "Partner", "Partner", "Partner"];

export const mediaNewsItems = [
  "USCL T20 Season 2026 dates announced",
  "Franchise auction desk goes live",
  "500+ players enter registration window",
];

/** Fixed gallery image sections — max 10 images each (managed in admin). */
export const portalGallerySections = [
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

/** Fixed video sections — max 1 video each (managed in admin). */
export const portalVideoSections = [
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

export const PORTAL_MAX_IMAGES_PER_SECTION = 10;
export const PORTAL_MAX_VIDEOS_PER_SECTION = 1;

/** @deprecated use portalGallerySections / portalVideoSections */
export const mediaCategories = [
  {
    id: "news",
    title: "News",
    body: "Match reports, auction updates, franchise announcements, and league stories.",
    items: mediaNewsItems,
  },
  {
    id: "gallery",
    title: "Gallery",
    body: "Photos from auctions, fixtures, and finals night.",
    items: portalGallerySections.map((s) => s.title),
  },
  {
    id: "videos",
    title: "Videos",
    body: "Highlights, interviews, and live stream catch-up.",
    items: portalVideoSections.map((s) => s.title),
  },
];

export const liveSections = [
  {
    id: "fixtures",
    title: "Fixtures",
    body: "Upcoming USCL T20 match pairings across the league stage and knockouts.",
  },
  {
    id: "schedule",
    title: "Schedule",
    body: "Day-by-day timeline for 31 matches over 16 days.",
  },
  {
    id: "points",
    title: "Points Table",
    body: "Live standing of all 8 franchises during the league stage.",
  },
  {
    id: "results",
    title: "Results",
    body: "Completed match outcomes, margins, and match awards.",
  },
  {
    id: "leaderboard",
    title: "Leaderboard",
    body: "Top batters, bowlers, and impact players across the season.",
  },
];

export const wesleyContent = {
  title: "Wesley Elite Sports",
  tagline: "Building corporate sports. Creating lasting connections.",
  about:
    "Wesley Elite Sports is a Hyderabad-based sports management company organizing USCL and previous corporate cricket leagues for industry communities.",
  vision:
    "To make corporate sports a national platform for talent, culture, and long-term professional networks.",
  mission:
    "Design and deliver premium tournament experiences — from player registration and auctions to finals and award ceremonies.",
  pastTournaments: [
    "Corporate T20 Challenge",
    "Industry Premier Cup",
    "USCL T20 Season Launch Series",
  ],
  contact: {
    email: "info@usclt20.com",
    phone: "+91 99999 99999",
    address: "Hyderabad, India",
  },
};

export const franchiseOffer = {
  investment: "₹5,00,000",
  slots: 8,
  perks: [
    "Official franchise identity & kit rights",
    "Access to player auction pool",
    "Match-day operations support",
    "Brand visibility across league media",
    "Owner networking & hospitality",
  ],
};

export const socialLinks = [
  { label: "Facebook", href: "#" },
  { label: "Instagram", href: "#" },
  { label: "LinkedIn", href: "#" },
  { label: "YouTube", href: "#" },
  { label: "Twitter (X)", href: "#" },
];

export const AUCTION_TARGET = new Date("2026-09-05T10:00:00+05:30");
