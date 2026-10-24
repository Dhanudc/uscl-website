export function squadRoleLabel(role) {
  if (role === "captain") return "Captain";
  if (role === "vice_captain") return "Vice captain";
  if (role === "mentor") return "Mentor";
  if (role === "owner") return "Franchise owner";
  return "Player";
}

/**
 * @param {{ role: string, accent?: string, compact?: boolean, className?: string }} props
 */
export default function SquadRoleBadge({ role, accent = "var(--accent)", compact = false, className = "" }) {
  const normalized = String(role || "player").toLowerCase();
  if (
    normalized !== "captain" &&
    normalized !== "vice_captain" &&
    normalized !== "mentor" &&
    normalized !== "owner"
  ) {
    return null;
  }

  if (normalized === "owner") {
    const sizeClass = compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]";
    return (
      <span
        className={`inline-flex shrink-0 items-center rounded-full font-bold uppercase tracking-wide ${sizeClass} ${className}`.trim()}
        style={{
          background: `${accent}18`,
          color: accent,
          border: `1px solid ${accent}66`,
        }}
      >
        Franchise owner
      </span>
    );
  }

  if (normalized === "mentor") {
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

  const isCaptain = normalized === "captain";
  const sizeClass = compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]";

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full font-bold uppercase tracking-wide ${sizeClass} ${className}`.trim()}
      style={{
        background: isCaptain ? accent : `${accent}28`,
        color: isCaptain ? "#fff" : accent,
        border: `1px solid ${isCaptain ? accent : `${accent}99`}`,
        boxShadow: isCaptain ? `0 0 12px ${accent}44` : undefined,
      }}
    >
      {squadRoleLabel(normalized)}
    </span>
  );
}
