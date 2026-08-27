import { Link } from "react-router-dom";
import { useSiteSettings } from "../context/SiteSettingsContext";

/**
 * Public Register CTA — always visible.
 * When registration is closed, label is "Registration" and /register
 * shows the coming-soon page instead of the form.
 */
export default function RegisterCta({
  className = "btn-primary",
  openLabel = "Register",
  closedLabel = "Registration",
  children,
}) {
  const { registrationEnabled } = useSiteSettings();
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
