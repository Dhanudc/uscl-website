import { Link } from "react-router-dom";
import UsclLogoMark from "./UsclLogoMark";

/**
 * @param {{ to?: string, variant?: "public" | "admin" | "mark", className?: string, linkClassName?: string }} props
 */
export default function SiteLogo({
  to,
  variant = "public",
  className = "",
  linkClassName = "",
}) {
  const rowClass = `flex min-w-0 items-center gap-2 sm:gap-2.5 ${className}`.trim();

  const inner =
    variant === "mark" ? (
      <UsclLogoMark variant="mark" />
    ) : (
      <span className={rowClass}>
        <UsclLogoMark variant={variant === "admin" ? "admin" : "header"} />
        {variant === "public" ? (
          <span className="min-w-0 flex-1 leading-tight sm:flex-initial">
            <span className="font-display block text-[0.68rem] leading-[1.2] text-[color:var(--title)] sm:text-base sm:leading-none">
              Champions League
            </span>
            <span className="mt-0.5 block text-[8px] font-semibold uppercase tracking-[0.12em] text-accent sm:text-[9px] sm:tracking-[0.14em]">
              Season 2026
            </span>
          </span>
        ) : null}
        {variant === "admin" ? (
          <span className="min-w-0 leading-tight">
            <span className="font-display block text-base text-[color:var(--title)] sm:text-lg">USCL Admin</span>
            <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
              Staff portal
            </span>
          </span>
        ) : null}
      </span>
    );

  if (!to) return inner;

  return (
    <Link
      to={to}
      className={`flex min-w-0 items-center no-underline ${linkClassName}`.trim()}
      aria-label="USCL — home"
    >
      {inner}
    </Link>
  );
}
