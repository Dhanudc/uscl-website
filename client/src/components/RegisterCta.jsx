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
  const { registrationEnabled, isModuleVisible } = useSiteSettings();

  if (!isModuleVisible("register")) return null;

  const label = children || (registrationEnabled ? openLabel : closedLabel);

  return (
    <Link
      to="/register"
      className={className}
      title={
        registrationEnabled
          ? "Open registration"
          : "Registration opens shortly — tap to see details"
      }
    >
      {!registrationEnabled && !children ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="reg-cta-dot" aria-hidden="true" />
          {closedLabel}
        </span>
      ) : (
        label
      )}
    </Link>
  );
}
