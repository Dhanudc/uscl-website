import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../context/ThemeContext";

const PANEL_WIDTH = 256;
const VIEWPORT_PADDING = 16;

function clampPanelPosition(buttonRect) {
  const width = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_PADDING * 2);
  let left = buttonRect.right - width;
  left = Math.max(
    VIEWPORT_PADDING,
    Math.min(left, window.innerWidth - width - VIEWPORT_PADDING)
  );
  const top = buttonRect.bottom + 8;
  return { top, left, width };
}

export default function ThemePicker({ compact = false }) {
  const { themeId, setThemeId, themes, theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);

  function updatePanelPosition() {
    if (!buttonRef.current) return;
    setPanelStyle(clampPanelPosition(buttonRef.current.getBoundingClientRect()));
  }

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePanelPosition();

    function onViewportChange() {
      updatePanelPosition();
    }

    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    function onDoc(e) {
      const target = e.target;
      if (rootRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-theme-picker-panel]")) return;
      setOpen(false);
    }

    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const panel =
    open && panelStyle ? (
      <div
        data-theme-picker-panel
        className="theme-picker-panel fixed z-[120] rounded-lg border border-[color:var(--border)] bg-[color:var(--ink-card)] p-2 shadow-xl"
        style={{
          top: panelStyle.top,
          left: panelStyle.left,
          width: panelStyle.width,
        }}
      >
        <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
          Templates
        </p>
        <div className="grid max-h-[min(60dvh,20rem)] gap-1 overflow-y-auto">
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
              <span className="min-w-0">
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
    ) : null;

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!open && buttonRef.current) {
            setPanelStyle(clampPanelPosition(buttonRef.current.getBoundingClientRect()));
          }
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--border)] px-2 py-1.5 text-[11px] font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
        title="Change theme"
        aria-label="Change theme"
      >
        <span
          className="inline-flex h-3.5 w-3.5 overflow-hidden rounded-full border border-[color:var(--border)]"
          style={{
            background: `linear-gradient(135deg, ${theme.swatch[0]} 40%, ${theme.swatch[1]} 40%)`,
          }}
        />
        {!compact ? "Theme" : null}
      </button>

      {typeof document !== "undefined" ? createPortal(panel, document.body) : null}
    </div>
  );
}
