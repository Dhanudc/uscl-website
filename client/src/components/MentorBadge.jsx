/** @param {{ accent?: string, compact?: boolean, className?: string }} props */
export default function MentorBadge({ accent = "var(--accent)", compact = false, className = "" }) {
  const sizeClass = compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full font-bold uppercase tracking-wide ${sizeClass} ${className}`.trim()}
      style={{
        background: `${accent}22`,
        color: accent,
        border: `1px solid ${accent}88`,
      }}
    >
      Mentor
    </span>
  );
}
