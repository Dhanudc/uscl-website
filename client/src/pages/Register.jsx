import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import PasswordInput from "../components/PasswordInput";
import PlayerDataConsentForm from "../components/PlayerDataConsentForm";
import { AlertBanner, EmptyState, PageLoader } from "../components/ui";
import RegistrationComingSoon from "../components/RegistrationComingSoon";
import ZoomableImage from "../components/ZoomableImage";
import { useAuth } from "../context/AuthContext";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { PLAYER_DATA_CONSENT } from "../data/playerDataConsent";
import { PLAYER_ROLES, playerRoleLabel } from "../data/playerRoles";
import { compressImageForUpload, paymentScreenshotUrl, profileImageUrl } from "../utils/media";
import { getPaymentStatus, paymentStatusLabel } from "../utils/paymentStatus";
import {
  buildRegistrationPaymentFields,
  openPaymentCheckout,
  paymentProviderLabel,
} from "../utils/payments";

const REGISTER_TYPES = [
  { value: "captain", label: "Captain", hint: "Register as team captain for the auction", badge: "C" },
  { value: "player", label: "Player", hint: "Batsman, bowler, all-rounder, or wicketkeeper", badge: "P" },
  { value: "franchise", label: "Franchise", hint: "Own and manage a USCL franchise team", badge: "F" },
  { value: "sponsor", label: "Sponsor", hint: "Browse brand packages and buy a slot", badge: "S", href: "/sponsorship" },
];

export default function Register() {
  const { user, loading, refresh } = useAuth();
  const { registrationEnabled, loading: settingsLoading } = useSiteSettings();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [existing, setExisting] = useState(null);
  const [existingLoaded, setExistingLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState("");
  const [feeInr, setFeeInr] = useState(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState("");
  const [paymentConfigured, setPaymentConfigured] = useState(true);
  const [paymentProvider, setPaymentProvider] = useState("razorpay");
  const pendingSaveRef = useRef(null);
  /** Set from the pre-register popup: captain | player | franchise | sponsor */
  const [registerInterest, setRegisterInterest] = useState(null);
  const [sponsorPackageId, setSponsorPackageId] = useState("");
  const [sponsorPackageTitle, setSponsorPackageTitle] = useState("");
  const [showTypePicker, setShowTypePicker] = useState(true);
  const [showConsentModal, setShowConsentModal] = useState(false);

  useEffect(() => {
    const interest = String(searchParams.get("interest") || "").trim().toLowerCase();
    const pkg = String(searchParams.get("package") || "").trim();
    if (interest === "sponsor" && pkg) {
      setRegisterInterest("sponsor");
      setSponsorPackageId(pkg);
      setShowTypePicker(false);
    } else if (["captain", "player", "franchise"].includes(interest)) {
      setRegisterInterest(interest);
      setShowTypePicker(false);
    }
  }, [searchParams]);

  useEffect(() => {
    api("/api/registrations/payment-config")
      .then((data) => {
        setPaymentConfigured(Boolean(data.configured));
        setPaymentProvider(data.provider || "razorpay");
      })
      .catch(() => setPaymentConfigured(false));
  }, []);

  useEffect(() => {
    if (!registerInterest) {
      setFeeInr(null);
      setFeeError("");
      return;
    }
    if (registerInterest === "sponsor" && !sponsorPackageId) {
      setFeeInr(null);
      setFeeError("");
      return;
    }

    setFeeLoading(true);
    setFeeError("");
    const qs = new URLSearchParams({ interest: registerInterest });
    if (registerInterest === "sponsor" && sponsorPackageId) {
      qs.set("sponsorPackageId", sponsorPackageId);
    }

    api(`/api/registrations/payment-config?${qs.toString()}`)
      .then((data) => {
        if (Number.isFinite(Number(data.feeInr)) && Number(data.feeInr) > 0) {
          setFeeInr(Number(data.feeInr));
          setFeeError("");
        } else {
          setFeeInr(null);
          setFeeError("Fee could not be loaded. Check that the server is running.");
        }
        setPaymentConfigured(Boolean(data.configured));
        setPaymentProvider(data.provider || "razorpay");
        if (data.sponsorPackage?.title) {
          setSponsorPackageTitle(data.sponsorPackage.title);
        } else if (registerInterest !== "sponsor") {
          setSponsorPackageTitle("");
        }
      })
      .catch((err) => {
        setFeeInr(null);
        setFeeError(err.message || "Unable to load registration fee.");
      })
      .finally(() => setFeeLoading(false));
  }, [registerInterest, sponsorPackageId]);

  useEffect(() => {
    if (!user) {
      setExisting(null);
      setExistingLoaded(true);
      return;
    }
    setExistingLoaded(false);
    api("/api/registrations")
      .then((data) => setExisting(data.registrations?.[0] || null))
      .catch(() => setExisting(null))
      .finally(() => setExistingLoaded(true));
  }, [user]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function clearPendingSession() {
    pendingSaveRef.current = null;
  }

  async function finalizeRegistration({ utr = "", screenshot = null } = {}) {
    const pending = pendingSaveRef.current;
    if (!pending) {
      throw new Error("Registration session expired. Please submit the form again.");
    }

    const formData = new FormData();
    formData.set("fullName", pending.values.fullName);
    formData.set("email", pending.values.email);
    formData.set("phone", pending.values.phone);
    formData.set("company", pending.values.company);
    formData.set("designation", pending.values.designation || "");
    formData.set("role", pending.values.role);
    formData.set("interest", pending.values.interest);
    if (pending.values.sponsorPackageId) {
      formData.set("sponsorPackageId", pending.values.sponsorPackageId);
    }
    formData.set("agreedToTerms", pending.agreedToTerms ? "true" : "false");
    formData.set("paymentStatus", pending.paymentStatus || "pending");
    formData.set("utrNumber", utr || "");
    formData.set("photo", pending.photoFile);

    if (pending.gatewayPayment) {
      const fields = buildRegistrationPaymentFields(pending.gatewayPayment);
      Object.entries(fields).forEach(([key, value]) => {
        if (value) formData.set(key, value);
      });
    } else if (pending.razorpay?.orderId) {
      formData.set("razorpayOrderId", pending.razorpay.orderId);
      formData.set("razorpayPaymentId", pending.razorpay.paymentId);
      formData.set("razorpaySignature", pending.razorpay.signature);
    }

    if (screenshot) {
      formData.set("paymentScreenshot", screenshot);
    }

    try {
      const data = await api("/api/registrations", {
        method: "POST",
        body: formData,
      });
      setExisting(data.registration);
      clearPendingSession();
      return data.registration;
    } catch (err) {
      if (/already have an active/i.test(err.message || "")) {
        try {
          const data = await api("/api/registrations");
          const reg = data.registrations?.[0] || null;
          if (reg) {
            setExisting(reg);
            clearPendingSession();
            return reg;
          }
        } catch {
          /* fall through */
        }
      }
      throw err;
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const form = e.currentTarget;

    try {
      const photoFile = form.photo.files?.[0];
      if (!photoFile) {
        throw new Error("Please upload a photo.");
      }

      const needsPlayingRole =
        registerInterest === "player" || registerInterest === "captain";
      const interest = registerInterest || "player";
      const role = needsPlayingRole
        ? form.role.value.trim()
        : interest;

      if (!registerInterest) {
        throw new Error("Please choose Captain, Player, Franchise, or Sponsor first.");
      }
      if (registerInterest === "sponsor" && !sponsorPackageId) {
        throw new Error("Please choose a sponsor package on the Sponsors page first.");
      }
      if (needsPlayingRole && !role) {
        throw new Error("Please select a playing role.");
      }

      const values = {
        fullName: form.fullName.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        password: form.password?.value || "",
        company: form.company.value.trim(),
        designation: form.designation?.value?.trim() || "",
        role,
        interest,
        sponsorPackageId: registerInterest === "sponsor" ? sponsorPackageId : "",
      };
      const agreedToTerms = form.agreedToTerms.checked;
      if (!agreedToTerms) {
        throw new Error(
          "Please read and agree to the USCL Player Data Processing & Sharing Consent."
        );
      }

      if (!user) {
        if (!values.password || values.password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        await api("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({
            name: values.fullName,
            email: values.email,
            phone: values.phone,
            password: values.password,
          }),
        });
        await refresh();
      }

      let paymentNote = "";
      let paymentStatus = "pending";
      let gatewayPayment = null;

      if (paymentConfigured) {
        try {
          const order = await api("/api/registrations/create-order", {
            method: "POST",
            body: JSON.stringify({
              interest,
              sponsorPackageId: registerInterest === "sponsor" ? sponsorPackageId : "",
              phone: values.phone,
              email: values.email,
            }),
          });
          const payment = await openPaymentCheckout(order, values);
          if (payment.ok) {
            gatewayPayment = payment;
            paymentStatus = "paid";
          } else {
            const reason = payment.reason || "Payment failed.";
            paymentNote = reason;
            paymentStatus = /cancel/i.test(reason) ? "cancelled" : "failed";
          }
        } catch (payErr) {
          paymentNote = payErr.message || "Payment failed.";
          paymentStatus = /cancel/i.test(paymentNote) ? "cancelled" : "failed";
        }
      } else {
        paymentNote =
          "Online payment is not configured on the server. Registration will be saved as pending.";
        paymentStatus = "pending";
      }

      if (paymentConfigured && paymentStatus !== "paid") {
        throw new Error(paymentNote || "Payment was not completed. Please try again.");
      }

      const compressedPhoto = await compressImageForUpload(photoFile);
      pendingSaveRef.current = {
        values,
        photoFile: compressedPhoto,
        agreedToTerms,
        paymentNote,
        paymentStatus,
        gatewayPayment,
        fullName: values.fullName,
      };

      await finalizeRegistration();
    } catch (err) {
      setError(err.message);
      clearPendingSession();
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || settingsLoading || !existingLoaded) {
    return (
      <section className="bg-ink px-4 py-8">
        <PageLoader message="Loading registration…" />
      </section>
    );
  }

  if (!registrationEnabled && !existing) {
    return <RegistrationComingSoon />;
  }

  return (
    <section className="bg-ink px-4 py-8 md:py-10">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow text-accent">Player Registration</p>
        <h1 className="page-title mt-1.5 text-accent">Register. Get Auctioned. Enter into USCL.</h1>

        {existing ? (
          <div className="panel mt-5 space-y-3 rounded-lg p-5">
            <AlertBanner tone="ok">
              {getPaymentStatus(existing) === "paid"
                ? "Registration successful. Payment received and a confirmation email has been sent."
                : "Registration submitted successfully. A confirmation email has been sent."}
            </AlertBanner>
            <p className="font-display text-xl text-[color:var(--title)]">Registration successful</p>
            <p className="text-sm text-[color:var(--text-muted)]">
              Status: <strong className="uppercase text-accent">{existing.status}</strong>
            </p>
            <div className="flex flex-wrap items-start gap-4">
              {profileImageUrl(existing) ? (
                <ZoomableImage
                  src={profileImageUrl(existing)}
                  alt={existing.fullName}
                  className="h-24 w-24 rounded-lg border border-[color:var(--border)] object-cover"
                />
              ) : null}
              <div className="grid min-w-0 flex-1 gap-2 text-sm text-[color:var(--text)] sm:grid-cols-2">
                <p>Name: {existing.fullName}</p>
                <p>Player ID: {existing.playerCode || "—"}</p>
                <p>Email: {existing.email}</p>
                <p>Phone: {existing.phone}</p>
                <p>Company: {existing.company}</p>
                <p>Designation: {existing.designation || "—"}</p>
                <p>
                  Interest:{" "}
                  <strong className="uppercase text-accent-soft">
                    {existing.interest || "player"}
                  </strong>
                </p>
                {existing.interest === "player" || existing.interest === "captain" ? (
                  <p>Role: {playerRoleLabel(existing.role)}</p>
                ) : null}
                <p>
                  Payment:{" "}
                  <strong className="uppercase text-accent-soft">
                    {paymentStatusLabel(getPaymentStatus(existing))}
                  </strong>
                  {existing.payment?.amountInr ? ` · ₹${existing.payment.amountInr}` : ""}
                </p>
                {existing.utrNumber ? <p>UTR: {existing.utrNumber}</p> : null}
                {paymentScreenshotUrl(existing) ? (
                  <p className="sm:col-span-2">
                    Payment screenshot:{" "}
                    <a
                      href={paymentScreenshotUrl(existing)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent-soft underline"
                    >
                      View
                    </a>
                  </p>
                ) : null}
                <p>
                  Auction:{" "}
                  <strong className="uppercase text-accent-soft">
                    {existing.auctionStatus || "not_listed"}
                  </strong>
                </p>
                {existing.franchiseName ? <p>Team: {existing.franchiseName}</p> : null}
                {existing.sponsorPackageTitle ? (
                  <p>Package: {existing.sponsorPackageTitle}</p>
                ) : null}
              </div>
            </div>
            <Link to="/dashboard" className="btn-primary inline-flex">
              Open Dashboard
            </Link>
          </div>
        ) : registerInterest ? (
          <form
            onSubmit={onSubmit}
            encType="multipart/form-data"
            className="panel mt-8 grid gap-3 rounded-2xl p-6 sm:grid-cols-2"
          >
            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color:var(--border)] bg-ink-soft px-3 py-2">
              <p className="text-sm text-[color:var(--text)]">
                Registering as{" "}
                <strong className="uppercase text-accent">{registerInterest}</strong>
              </p>
              <button
                type="button"
                className="text-xs font-semibold text-accent-soft underline"
                onClick={() => {
                  setRegisterInterest(null);
                  setSponsorPackageId("");
                  setSponsorPackageTitle("");
                  setShowTypePicker(true);
                }}
              >
                Change
              </button>
            </div>
            {registerInterest === "sponsor" && sponsorPackageId ? (
              <div className="sm:col-span-2 rounded-lg border border-accent/35 bg-accent/10 px-4 py-3">
                <p className="text-sm font-semibold text-[color:var(--title)]">
                  Sponsor package: {sponsorPackageTitle || sponsorPackageId}
                </p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  Payment amount{" "}
                  {feeLoading || feeInr == null
                    ? "…"
                    : `₹${feeInr.toLocaleString("en-IN")}`}{" "}
                  for this package.
                </p>
                <Link to="/sponsorship" className="mt-2 inline-block text-xs text-accent-soft underline">
                  Change package
                </Link>
              </div>
            ) : null}
            <Field label="Full Name" name="fullName" defaultValue={user?.name || ""} required />
            <Field
              label="Email"
              name="email"
              type="email"
              defaultValue={user?.email || ""}
              required
            />
            <Field label="Phone" name="phone" defaultValue={user?.phone || ""} required />
            {!user ? (
              <PasswordInput label="Password" name="password" required minLength={6} className="input-dark" />
            ) : null}
            <Field label="Company" name="company" required />
            <Field label="Designation" name="designation" placeholder="e.g. Software Engineer" required />
            {registerInterest === "player" || registerInterest === "captain" ? (
              <label className="block text-sm">
                <span className="text-[color:var(--text-muted)]">Role</span>
                <select name="role" className="input-dark mt-1.5" required defaultValue="">
                  <option value="" disabled>
                    Select playing role
                  </option>
                  {PLAYER_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {/* Interest comes from the pre-register popup */}
            <input type="hidden" name="interest" value={registerInterest || "player"} />
            {registerInterest === "sponsor" && sponsorPackageId ? (
              <input type="hidden" name="sponsorPackageId" value={sponsorPackageId} />
            ) : null}

            <label className="block text-sm sm:col-span-2">
              <span className="text-[color:var(--text-muted)]">Photo (JPG/PNG/WEBP)</span>
              <input
                name="photo"
                type="file"
                accept="image/*"
                required
                className="mt-1.5 block w-full text-sm text-[color:var(--text-muted)] file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (preview) URL.revokeObjectURL(preview);
                  setPreview(file ? URL.createObjectURL(file) : "");
                }}
              />
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="mt-3 h-28 w-28 rounded-lg border border-[color:var(--border)] object-cover"
                />
              ) : null}
            </label>

            <div className="sm:col-span-2 rounded-lg border border-[color:var(--border)] bg-ink-soft px-4 py-3">
              <p className="text-sm font-semibold text-[color:var(--title)]">
                {registerInterest === "sponsor" ? "Package fee" : "Registration fee"}:{" "}
                {feeLoading ? (
                  <span className="text-[color:var(--text-muted)]">Loading…</span>
                ) : feeInr != null ? (
                  <>₹{feeInr.toLocaleString("en-IN")}</>
                ) : (
                  <span className="text-accent">Unavailable</span>
                )}
              </p>
              {feeError ? (
                <div className="mt-2">
                  <AlertBanner tone="error">
                    {feeError} Make sure the server is running, then refresh or change registration type.
                  </AlertBanner>
                </div>
              ) : null}
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                {paymentProviderLabel(paymentProvider)} checkout opens after you click Pay &amp;
                Submit. After payment succeeds, your registration is saved and a confirmation email
                is sent.
              </p>
              {!paymentConfigured && (
                <p className="mt-2 text-xs text-accent">
                  {paymentProviderLabel(paymentProvider)} keys are missing on the server. Add them in
                  server `.env`.
                </p>
              )}
            </div>

            <label className="sm:col-span-2 flex items-start gap-3 text-sm text-[color:var(--text)]">
              <input
                type="checkbox"
                name="agreedToTerms"
                required
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
              />
              <span>
                I have read and agree to the{" "}
                <button
                  type="button"
                  className="font-semibold text-accent underline underline-offset-2 hover:text-accent-soft"
                  onClick={() => setShowConsentModal(true)}
                >
                  Terms and Conditions
                </button>{" "}
                (USCL Player Data Processing &amp; Sharing Consent) and authorise Wesley Elite Sports
                LLP to process and share my information as described.
              </span>
            </label>
            {error && <p className="sm:col-span-2 text-sm text-accent">{error}</p>}
            <button
              type="submit"
              disabled={submitting || feeLoading || feeInr == null}
              className="btn-primary sm:col-span-2"
            >
              {submitting
                ? "Processing payment..."
                : feeLoading || feeInr == null
                  ? "Loading fee…"
                  : `Pay ₹${feeInr.toLocaleString("en-IN")} & Submit`}
            </button>
          </form>
        ) : (
          <div className="mt-8">
            <EmptyState
            title="Choose how you want to register"
            description="Captain, Player, Franchise, or Sponsor — each path has its own fee set in admin."
            action={
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowTypePicker(true)}
              >
                Select registration type
              </button>
            }
            />
          </div>
        )}

        {!existing && !registerInterest && showTypePicker ? (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="register-type-title"
              className="panel relative w-full max-w-lg rounded-2xl p-5"
            >
              <p className="eyebrow text-accent">Before you register</p>
              <h2
                id="register-type-title"
                className="mt-1 font-display text-2xl text-[color:var(--title)]"
              >
                Who are you registering as?
              </h2>
              <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                Pick one option. Your fee is loaded from admin settings for that type.
              </p>
              <div className="ui-type-grid mt-5">
                {REGISTER_TYPES.map((opt) =>
                  opt.href ? (
                    <Link key={opt.value} to={opt.href} className="ui-type-card">
                      <span className="ui-type-card__icon">{opt.badge}</span>
                      <span>
                        <span className="ui-type-card__label">{opt.label}</span>
                        <span className="ui-type-card__hint">{opt.hint}</span>
                      </span>
                    </Link>
                  ) : (
                    <button
                      key={opt.value}
                      type="button"
                      className="ui-type-card"
                      onClick={() => {
                        setRegisterInterest(opt.value);
                        setShowTypePicker(false);
                      }}
                    >
                      <span className="ui-type-card__icon">{opt.badge}</span>
                      <span>
                        <span className="ui-type-card__label">{opt.label}</span>
                        <span className="ui-type-card__hint">{opt.hint}</span>
                      </span>
                    </button>
                  )
                )}
              </div>
              <button
                type="button"
                className="btn-ghost mt-4 w-full"
                onClick={() => setShowTypePicker(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {!user && !existing ? (
          <p className="mt-5 text-sm text-[color:var(--text-muted)]">
            Already registered?{" "}
            <Link to="/signin" className="text-accent-soft">
              Sign in
            </Link>
          </p>
        ) : null}
      </div>

      {showConsentModal ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4"
          onClick={() => setShowConsentModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="consent-modal-title"
            className="panel relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4">
              <div>
                <p className="eyebrow text-accent">Required</p>
                <h2
                  id="consent-modal-title"
                  className="mt-1 font-display text-xl text-[color:var(--title)] sm:text-2xl"
                >
                  {PLAYER_DATA_CONSENT.title}
                </h2>
              </div>
              <button
                type="button"
                className="ui-modal-close"
                aria-label="Close terms and conditions"
                onClick={() => setShowConsentModal(false)}
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <PlayerDataConsentForm />
            </div>
            <div className="border-t border-[color:var(--border)] px-5 py-4">
              <button
                type="button"
                className="btn-primary w-full sm:w-auto"
                onClick={() => setShowConsentModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Field({ label, name, type = "text", required, defaultValue, minLength, placeholder }) {
  return (
    <label className="block text-sm">
      <span className="text-[color:var(--text-muted)]">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        minLength={minLength}
        placeholder={placeholder}
        className="input-dark mt-1.5"
      />
    </label>
  );
}
