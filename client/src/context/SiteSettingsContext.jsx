import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { DEFAULT_MODULE_VISIBILITY, normalizeModuleVisibility } from "../data/siteModules";

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
  referralProgramEnabled: true,
  moduleVisibility: { ...DEFAULT_MODULE_VISIBILITY },
  whatsappGroupUrl: "",
};

const SiteSettingsContext = createContext({
  contact: DEFAULTS.contact,
  socials: DEFAULTS.socials,
  registrationEnabled: true,
  referralProgramEnabled: true,
  moduleVisibility: DEFAULTS.moduleVisibility,
  whatsappGroupUrl: "",
  isModuleVisible: () => true,
  loading: true,
  refresh: async () => {},
});

export function SiteSettingsProvider({ children }) {
  const [contact, setContact] = useState(DEFAULTS.contact);
  const [socials, setSocials] = useState(DEFAULTS.socials);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [referralProgramEnabled, setReferralProgramEnabled] = useState(true);
  const [moduleVisibility, setModuleVisibility] = useState(DEFAULTS.moduleVisibility);
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api("/api/settings");
      if (data.settings?.contact) setContact(data.settings.contact);
      if (Array.isArray(data.settings?.socials)) {
        setSocials(normalizeSocials(data.settings.socials, data.settings.contact));
      }
      setRegistrationEnabled(data.settings?.registrationEnabled !== false);
      setReferralProgramEnabled(data.settings?.referralProgramEnabled !== false);
      setModuleVisibility(normalizeModuleVisibility(data.settings?.moduleVisibility));
      setWhatsappGroupUrl(String(data.settings?.whatsappGroupUrl || "").trim());
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
      referralProgramEnabled,
      moduleVisibility,
      whatsappGroupUrl,
      isModuleVisible,
      loading,
      refresh,
    }),
    [contact, socials, registrationEnabled, referralProgramEnabled, moduleVisibility, whatsappGroupUrl, isModuleVisible, loading, refresh]
  );

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
