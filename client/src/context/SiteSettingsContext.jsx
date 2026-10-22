import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { boardMembers as defaultBoardMembers } from "../data/siteContent";
import { DEFAULT_MODULE_VISIBILITY, normalizeModuleVisibility, normalizeNavLabels } from "../data/siteModules";

const DEFAULT_WHATSAPP_HREF = "https://wa.me/917386671777";

function isTwitterLabel(label) {
  const key = String(label || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  return key === "twitter" || key === "twitterx" || key === "x";
}

function normalizeSocials(socials, contact) {
  const phoneDigits = String(contact?.phone || "").replace(/\D/g, "");
  const fallbackHref =
    phoneDigits.length >= 10 && !/^91?9{5,}/.test(phoneDigits)
      ? `https://wa.me/${phoneDigits}`
      : DEFAULT_WHATSAPP_HREF;

  const mapped = (Array.isArray(socials) ? socials : []).map((item) => {
    const label = String(item?.label || "").trim();
    const href = String(item?.href || "").trim() || "#";
    if (isTwitterLabel(label) || /^whatsapp$/i.test(label)) {
      const keep = /wa\.me|whatsapp\.com|api\.whatsapp/i.test(href);
      return { ...item, label: "WhatsApp", href: keep ? href : fallbackHref };
    }
    return item;
  });

  const seen = new Set();
  return mapped.filter((item) => {
    const key = String(item.label || "").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const DEFAULTS = {
  contact: {
    email: "info@usclt20.com",
    phone: "+91 99999 99999",
    address: "Hyderabad, India",
  },
  socials: [
    { label: "Facebook", href: "#", iconUrl: "" },
    { label: "Instagram", href: "#", iconUrl: "" },
    { label: "LinkedIn", href: "#", iconUrl: "" },
    { label: "YouTube", href: "#", iconUrl: "" },
    { label: "WhatsApp", href: DEFAULT_WHATSAPP_HREF, iconUrl: "" },
  ],
  registrationEnabled: true,
  registrationSeasonClosed: false,
  registrationSeasonClosedCopy: {
    title: "Registrations are closed for this season",
    message:
      "Get ready for next season — stay tuned for USCL T20 updates and see you at the auction.",
  },
  playerPayNowEnabled: true,
  playerTeamCardEnabled: true,
  captainAddMentorEnabled: true,
  referralProgramEnabled: true,
  moduleVisibility: { ...DEFAULT_MODULE_VISIBILITY },
  navLabels: normalizeNavLabels({}),
  whatsappGroupUrl: "",
  upcomingEvents: [],
  membersIntro: {
    title: "Members",
    body: "Players, franchise owners, sponsors, and partners from 100+ companies shaping the USCL community every season.",
  },
  boardMembers: defaultBoardMembers,
  keyDates: [],
  auctionTopSoldPriceTiers: 5,
};

const SiteSettingsContext = createContext({
  contact: DEFAULTS.contact,
  socials: DEFAULTS.socials,
  registrationEnabled: true,
  registrationSeasonClosed: false,
  registrationSeasonClosedCopy: {
    title: "Registrations are closed for this season",
    message:
      "Get ready for next season — stay tuned for USCL T20 updates and see you at the auction.",
  },
  playerPayNowEnabled: true,
  playerTeamCardEnabled: true,
  captainAddMentorEnabled: true,
  referralProgramEnabled: true,
  moduleVisibility: DEFAULTS.moduleVisibility,
  navLabels: DEFAULTS.navLabels,
  whatsappGroupUrl: "",
  upcomingEvents: [],
  membersIntro: DEFAULTS.membersIntro,
  boardMembers: DEFAULTS.boardMembers,
  keyDates: [],
  auctionTopSoldPriceTiers: 5,
  navLabel: () => "",
  isModuleVisible: () => true,
  loading: true,
  refresh: async () => {},
});

export function SiteSettingsProvider({ children }) {
  const [contact, setContact] = useState(DEFAULTS.contact);
  const [socials, setSocials] = useState(DEFAULTS.socials);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [registrationSeasonClosed, setRegistrationSeasonClosed] = useState(false);
  const [registrationSeasonClosedCopy, setRegistrationSeasonClosedCopy] = useState(
    DEFAULTS.registrationSeasonClosedCopy
  );
  const [playerPayNowEnabled, setPlayerPayNowEnabled] = useState(true);
  const [playerTeamCardEnabled, setPlayerTeamCardEnabled] = useState(true);
  const [captainAddMentorEnabled, setCaptainAddMentorEnabled] = useState(true);
  const [referralProgramEnabled, setReferralProgramEnabled] = useState(true);
  const [moduleVisibility, setModuleVisibility] = useState(DEFAULTS.moduleVisibility);
  const [navLabels, setNavLabels] = useState(DEFAULTS.navLabels);
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState("");
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [membersIntro, setMembersIntro] = useState(DEFAULTS.membersIntro);
  const [boardMembers, setBoardMembers] = useState(DEFAULTS.boardMembers);
  const [keyDates, setKeyDates] = useState([]);
  const [auctionTopSoldPriceTiers, setAuctionTopSoldPriceTiers] = useState(
    DEFAULTS.auctionTopSoldPriceTiers
  );
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api("/api/settings");
      if (data.settings?.contact) setContact(data.settings.contact);
      if (Array.isArray(data.settings?.socials)) {
        setSocials(normalizeSocials(data.settings.socials, data.settings.contact));
      }
      setRegistrationEnabled(data.settings?.registrationEnabled !== false);
      setRegistrationSeasonClosed(data.settings?.registrationSeasonClosed === true);
      if (data.settings?.registrationSeasonClosedCopy) {
        setRegistrationSeasonClosedCopy(data.settings.registrationSeasonClosedCopy);
      }
      setPlayerPayNowEnabled(data.settings?.playerPayNowEnabled !== false);
      setPlayerTeamCardEnabled(data.settings?.playerTeamCardEnabled !== false);
      setCaptainAddMentorEnabled(data.settings?.captainAddMentorEnabled !== false);
      setReferralProgramEnabled(data.settings?.referralProgramEnabled !== false);
      setModuleVisibility(normalizeModuleVisibility(data.settings?.moduleVisibility));
      setNavLabels(normalizeNavLabels(data.settings?.navLabels));
      setWhatsappGroupUrl(String(data.settings?.whatsappGroupUrl || "").trim());
      setUpcomingEvents(Array.isArray(data.settings?.upcomingEvents) ? data.settings.upcomingEvents : []);
      if (data.settings?.membersIntro) setMembersIntro(data.settings.membersIntro);
      if (Array.isArray(data.settings?.boardMembers) && data.settings.boardMembers.length) {
        setBoardMembers(data.settings.boardMembers);
      }
      if (Array.isArray(data.settings?.keyDates) && data.settings.keyDates.length) {
        setKeyDates(data.settings.keyDates);
      }
      const tiers = Number(data.settings?.auctionTopSoldPriceTiers);
      if (Number.isFinite(tiers) && tiers >= 1) {
        setAuctionTopSoldPriceTiers(Math.min(20, Math.round(tiers)));
      }
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const navLabel = useCallback(
    (key) => navLabels[key] || "",
    [navLabels]
  );

  const isModuleVisible = useCallback(
    (key) => {
      if (!key) return true;
      return moduleVisibility[key] !== false;
    },
    [moduleVisibility]
  );

  const value = useMemo(
    () => ({
      contact,
      socials,
      registrationEnabled,
      registrationSeasonClosed,
      registrationSeasonClosedCopy,
      playerPayNowEnabled,
      playerTeamCardEnabled,
      captainAddMentorEnabled,
      referralProgramEnabled,
      moduleVisibility,
      navLabels,
      navLabel,
      whatsappGroupUrl,
      upcomingEvents,
      membersIntro,
      boardMembers,
      keyDates,
      auctionTopSoldPriceTiers,
      isModuleVisible,
      loading,
      refresh,
    }),
    [contact, socials, registrationEnabled, registrationSeasonClosed, registrationSeasonClosedCopy, playerPayNowEnabled, playerTeamCardEnabled, captainAddMentorEnabled, referralProgramEnabled, moduleVisibility, navLabels, navLabel, whatsappGroupUrl, upcomingEvents, membersIntro, boardMembers, keyDates, auctionTopSoldPriceTiers, isModuleVisible, loading, refresh]
  );

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
