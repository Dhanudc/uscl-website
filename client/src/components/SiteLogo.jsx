import { useState } from "react";
import { Link } from "react-router-dom";

const LOGO_PRIMARY = "/brand/uscl-logo.png";
const LOGO_SVG = "/brand/uscl-logo.svg";
const LOGO_FALLBACK = "/favicon.svg";

/**
 * @param {{ to?: string, variant?: "public" | "admin" | "mark", className?: string, onDark?: boolean }} props
 */
export default function SiteLogo({ to, variant = "public", className = "", onDark = false }) {
  const [src, setSrc] = useState(LOGO_PRIMARY);

  const markClass =
    variant === "mark"
      ? "site-logo__mark site-logo__mark--sm"
      : variant === "admin"
        ? "site-logo__mark site-logo__mark--admin"
        : "site-logo__mark";

  const content = (
    <span className={`site-logo site-logo--${variant} ${className}`.trim()}>
      <span className={`${markClass} ${onDark ? "site-logo__mark--on-dark" : ""}`}>
        <img
          src={src}
          alt=""
          className="site-logo__img"
          width={84}
          height={44}
          onError={() => {
            if (src === LOGO_PRIMARY) setSrc(LOGO_SVG);
            else if (src !== LOGO_FALLBACK) setSrc(LOGO_FALLBACK);
          }}
        />
      </span>
      {variant === "public" ? (
        <span className="site-logo__text min-w-0">
          <span className="site-logo__title font-display">Champions League</span>
          <span className="site-logo__tag">Season 2026</span>
        </span>
      ) : null}
      {variant === "admin" ? (
        <span className="site-logo__text min-w-0">
          <span className="site-logo__title font-display">USCL Admin</span>
          <span className="site-logo__subtitle site-logo__subtitle--admin">Staff portal</span>
        </span>
      ) : null}
    </span>
  );

  if (!to) return content;

  return (
    <Link to={to} className="site-logo-link min-w-0 shrink-0" aria-label="USCL — home">
      {content}
    </Link>
  );
}
