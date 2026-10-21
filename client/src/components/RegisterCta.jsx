import { Link } from "react-router-dom";
import { useSiteSettings } from "../context/SiteSettingsContext";

/**
 * Public Register CTA.
 * Hidden entirely when the Register module is disabled in admin settings.
 * When registration is closed (but module visible), label is "Registration".
 */
export default function RegisterCta({
  className = "btn-primary",
  openLabel = "Register",
  closedLabel = "Registration",
  children,
}) {
  const { registrationEnabled, registrationSeasonClosed, isModuleVisible } = useSiteSettings();

  if (!isModuleVisible("register")) return null;

  const closed = registrationSeasonClosed || !registrationEnabled;
  const seasonClosedLabel = "Registration closed";
  const label =
    children ||
    (registrationSeasonClosed ? seasonClosedLabel : registrationEnabled ? openLabel : closedLabel);

  return (
    <Link
      to="/register"
      onClick={() => window.scrollTo(0, 0)}
      className={className}
      title={
        registrationSeasonClosed
          ? "Registrations are closed for this season"
          : registrationEnabled
            ? "Open registration"
            : "Registration opens shortly — tap to see details"
      }
    >
      {closed && !children ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="reg-cta-dot" aria-hidden="true" />
          {label}
        </span>
      ) : (
        label
      )}
    </Link>
  );
}
