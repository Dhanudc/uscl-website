import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api";

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
    { label: "Twitter (X)", href: "#", iconUrl: "" },
  ],
  registrationEnabled: true,
};

const SiteSettingsContext = createContext({
  contact: DEFAULTS.contact,
  socials: DEFAULTS.socials,
  registrationEnabled: true,
  loading: true,
  refresh: async () => {},
});

export function SiteSettingsProvider({ children }) {
  const [contact, setContact] = useState(DEFAULTS.contact);
  const [socials, setSocials] = useState(DEFAULTS.socials);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api("/api/settings");
      if (data.settings?.contact) setContact(data.settings.contact);
      if (Array.isArray(data.settings?.socials)) setSocials(data.settings.socials);
      setRegistrationEnabled(data.settings?.registrationEnabled !== false);
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ contact, socials, registrationEnabled, loading, refresh }),
    [contact, socials, registrationEnabled, loading, refresh]
  );

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
