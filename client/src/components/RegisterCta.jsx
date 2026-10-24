import { Link } from "react-router-dom";
import { useSiteSettings } from "../context/SiteSettingsContext";

/**
 * Public Register CTA.
 * Hidden entirely when the Register module is disabled in admin settings.
 * When registration is closed (but module visible), label is "Registrations closed".
 */
export default function RegisterCta({
  className = "btn-primary",
  openLabel,
  closedLabel,
  seasonClosedLabel,
  children,
}) {
  const { registrationEnabled, registrationSeasonClosed, isModuleVisible, navLabel } =
    useSiteSettings();

  if (!isModuleVisible("register")) return null;

  const registerNav = navLabel("register");
  const closed = registrationSeasonClosed || !registrationEnabled;
  const label =
    children ||
    (registrationSeasonClosed
      ? seasonClosedLabel || registerNav || "Registrations closed"
      : registrationEnabled
        ? openLabel || registerNav || "Register"
        : closedLabel || registerNav || "Registrations closed");

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
            : "Registrations open shortly — tap to see details"
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
