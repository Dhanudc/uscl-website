export function ArenaArt({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${compact ? "opacity-80" : ""}`}>
      <div className="arena-grid" />
      <div className="noise" />

      <svg
        className="crease-svg absolute right-[2%] top-[10%] hidden h-[80%] w-[58%] lg:block"
        viewBox="0 0 520 520"
        aria-hidden
      >
        <ellipse cx="260" cy="260" rx="210" ry="150" />
        <ellipse cx="260" cy="260" rx="70" ry="48" />
        <line x1="260" y1="110" x2="260" y2="410" />
        <line x1="230" y1="205" x2="290" y2="205" />
        <line x1="230" y1="315" x2="290" y2="315" />
        <path d="M245 205 V180 H275 V205" />
        <path d="M245 315 V340 H275 V315" />
      </svg>

      <div className="orbit-wrap">
        <div className="orbit-ring" />
        <div className="orbit-ring-2" />
        <div className="orbit-pulse" />
        <div className="orbit-ball-path">
          <div className="ball" />
        </div>
      </div>

      <div className="absolute bottom-[12%] right-[14%] hidden items-end gap-1.5 md:flex">
        <span className="h-12 w-1.5 rounded-sm bg-accent shadow-[0_0_12px_rgba(255,61,46,0.55)]" />
        <span className="h-14 w-1.5 rounded-sm bg-accent shadow-[0_0_12px_rgba(255,61,46,0.55)]" />
        <span className="h-12 w-1.5 rounded-sm bg-accent shadow-[0_0_12px_rgba(255,61,46,0.55)]" />
      </div>
    </div>
  );
}
