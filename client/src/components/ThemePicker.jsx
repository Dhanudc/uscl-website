import { useEffect, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";

export default function ThemePicker() {
  const { themeId, setThemeId, themes, theme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--border)] px-2 py-1.5 text-[11px] font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
        title="Change theme"
      >
        <span
          className="inline-flex h-3.5 w-3.5 overflow-hidden rounded-full border border-[color:var(--border)]"
          style={{
            background: `linear-gradient(135deg, ${theme.swatch[0]} 40%, ${theme.swatch[1]} 40%)`,
          }}
        />
        Theme
      </button>

      {open && (
        <div className="absolute right-0 z-[60] mt-2 w-64 rounded-lg border border-[color:var(--border)] bg-[color:var(--ink-card)] p-2 shadow-xl">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            Templates
          </p>
          <div className="grid gap-1">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setThemeId(t.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left ${
                  themeId === t.id
                    ? "bg-[color:var(--accent)] text-white"
                    : "text-[color:var(--text)] hover:bg-[color:var(--ink-soft)]"
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 overflow-hidden rounded-md border border-black/10">
                  <span className="w-1/2" style={{ background: t.swatch[0] }} />
                  <span className="flex w-1/2 flex-col">
                    <span className="h-1/2" style={{ background: t.swatch[1] }} />
                    <span className="h-1/2" style={{ background: t.swatch[2] }} />
                  </span>
                </span>
                <span>
                  <span className="block text-xs font-semibold">{t.name}</span>
                  <span
                    className={`block text-[10px] ${
                      themeId === t.id ? "text-[color:var(--text)]" : "text-[color:var(--text-muted)]"
                    }`}
                  >
                    {t.desc}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
