import { LEAGUE_TAGLINE_LEAD, LEAGUE_TAGLINE_REST } from "../data/siteContent";

/**
 * League tagline with the lead words highlighted in the accent colour.
 * Renders a <span> by default so it can nest inside existing paragraphs.
 */
export default function LeagueTagline({
  as: Tag = "span",
  className = "",
  variant = "inline",
  withPeriod = true,
}) {
  const classes = ["league-tagline", `league-tagline--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={classes}>
      <span className="league-tagline__lead">{LEAGUE_TAGLINE_LEAD}</span>{" "}
      <span className="league-tagline__rest">
        {LEAGUE_TAGLINE_REST}
        {withPeriod ? "." : ""}
      </span>
    </Tag>
  );
}
