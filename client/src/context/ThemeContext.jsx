import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_THEME, THEMES } from "../themes";

const ThemeContext = createContext(null);
const STORAGE_KEY = "uscl-theme";

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  useEffect(() => {
    const valid = THEMES.some((t) => t.id === themeId) ? themeId : DEFAULT_THEME;
    if (valid !== themeId) setThemeId(valid);
    document.documentElement.setAttribute("data-theme", valid);
    try {
      localStorage.setItem(STORAGE_KEY, valid);
    } catch {
      /* ignore */
    }
  }, [themeId]);

  const value = useMemo(
    () => ({
      themeId,
      setThemeId,
      themes: THEMES,
      theme: THEMES.find((t) => t.id === themeId) || THEMES[0],
    }),
    [themeId]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
