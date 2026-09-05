import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  const navigate = useNavigate();
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
  const [pendingSave, setPendingSave] = useState(null);
  const pendingSaveRef = useRef(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [modalError, setModalError] = useState("");
  const [finishing, setFinishing] = useState(false);
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
      if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    };
  }, [preview, screenshotPreview]);

  function clearPaymentModalFields() {
    setUtrNumber("");
    setScreenshotFile(null);
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotPreview("");
    setModalError("");
  }

  function openPaymentDetailsPopup(payload) {
    pendingSaveRef.current = payload;
    setPendingSave(payload);
    clearPaymentModalFields();
  }

  function closePaymentModal({ redirectToDashboard = false } = {}) {
    pendingSaveRef.current = null;
    setPendingSave(null);
    clearPaymentModalFields();
    if (redirectToDashboard) navigate("/dashboard");
  }

  async function finalizeRegistration({ utr = "", screenshot = null, closeModal = true }) {
    const pending = pendingSaveRef.current;
    if (!pending) {
      throw new Error("Registration session expired. Please submit the form again.");
    }

    const formData = new FormData();
    formData.set("fullName", pending.values.fullName);
    formData.set("email", pending.values.email);
    formData.set("phone", pending.values.phone);
    formData.set("company", pending.values.company);
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
      if (closeModal) closePaymentModal({ redirectToDashboard: true });
      return data.registration;
    } catch (err) {
      if (/already have an active/i.test(err.message || "")) {
        try {
          const data = await api("/api/registrations");
          const reg = data.registrations?.[0] || null;
          if (reg) {
            setExisting(reg);
            if (closeModal) closePaymentModal({ redirectToDashboard: true });
            return reg;
          }
        } catch {
          /* fall through */
        }
      }
      throw err;
    }
  }

  async function savePaymentDetails(registration) {
    const nextUtr = utrNumber.trim();
    const utrChanged = Boolean(nextUtr);
    const shotChanged = Boolean(screenshotFile);

    if (!utrChanged && !shotChanged) {
      throw new Error("No payment changes to save. Enter a UTR or upload a screenshot.");
    }

    const formData = new FormData();
    formData.set("fullName", registration.fullName || pendingSave?.fullName || "player");
    if (utrChanged) formData.set("utrNumber", nextUtr);
    if (shotChanged) {
      const compressed = await compressImageForUpload(screenshotFile);
      formData.set("paymentScreenshot", compressed);
    }

    const data = await api(`/api/registrations/${registration._id}/payment-details`, {
      method: "PATCH",
      body: formData,
    });
    setExisting(data.registration);
    closePaymentModal({ redirectToDashboard: true });
    return data.registration;
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
        paymentNote = "Online payment is not configured. Add UTR / screenshot if you paid offline.";
        paymentStatus = "pending";
      }

      const compressedPhoto = await compressImageForUpload(photoFile);
      const payload = {
        values,
        photoFile: compressedPhoto,
        agreedToTerms,
        paymentNote,
        paymentStatus,
        gatewayPayment,
        fullName: values.fullName,
      };

      pendingSaveRef.current = payload;

      if (paymentStatus === "paid") {
        try {
          const registration = await finalizeRegistration({
            utr: "",
            screenshot: null,
            closeModal: false,
          });
          openPaymentDetailsPopup({
            ...payload,
            paymentNote: "",
            savedRegistration: registration,
          });
        } catch (err) {
          openPaymentDetailsPopup({
            ...payload,
            paymentNote: err.message || "Could not save registration.",
          });
        }
      } else {
        openPaymentDetailsPopup(payload);
      }
    } catch (err) {
      setError(err.message);
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function onContinueWithDetails() {
    if (!pendingSaveRef.current) return;
    setModalError("");
    setFinishing(true);
    try {
      const saved = pendingSaveRef.current.savedRegistration;
      if (saved) {
        await savePaymentDetails(saved);
      } else {
        let screenshot = screenshotFile;
        if (screenshot) screenshot = await compressImageForUpload(screenshot);
        await finalizeRegistration({
          utr: utrNumber.trim(),
          screenshot,
        });
      }
    } catch (err) {
      setModalError(err.message);
    } finally {
      setFinishing(false);
    }
  }

  async function onSkipDetails() {
    if (!pendingSaveRef.current) return;
    if (pendingSaveRef.current.savedRegistration) {
      closePaymentModal({ redirectToDashboard: true });
      return;
    }
    setModalError("");
    setUtrNumber("");
    setScreenshotFile(null);
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotPreview("");
    setFinishing(true);
    try {
      await finalizeRegistration({ utr: "", screenshot: null });
    } catch (err) {
      setModalError(err.message);
    } finally {
      setFinishing(false);
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
            <p className="font-display text-xl text-[color:var(--title)]">Details saved</p>
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
                <p>Email: {existing.email}</p>
                <p>Phone: {existing.phone}</p>
                <p>Company: {existing.company}</p>
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
                Submit. Registration is saved after payment (or if you add offline payment details).
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
              disabled={submitting || Boolean(pendingSave) || feeLoading || feeInr == null}
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

      {pendingSave ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-details-title"
            className="panel relative w-full max-w-md rounded-2xl p-5"
          >
            <p className="eyebrow text-accent">
              {pendingSave.savedRegistration
                ? "Almost done"
                : pendingSave.paymentNote
                  ? "Payment incomplete"
                  : "Almost done"}
            </p>
            <h2 id="payment-details-title" className="mt-1 font-display text-2xl text-[color:var(--title)]">
              {pendingSave.savedRegistration ? "Add payment details" : "Save your registration"}
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              {pendingSave.fullName}
            </p>
            {pendingSave.savedRegistration ? (
              <AlertBanner tone="ok">
                Payment received and registration saved. Add UTR and a screenshot now, or skip and add them later from your dashboard.
              </AlertBanner>
            ) : pendingSave.paymentNote ? (
              <AlertBanner tone="error">{pendingSave.paymentNote}</AlertBanner>
            ) : (
              <AlertBanner tone="ok">
                Payment received. You can add UTR and a screenshot now, or skip and add them later.
              </AlertBanner>
            )}
            <p className="mt-3 text-sm text-[color:var(--text-muted)]">
              {pendingSave.savedRegistration
                ? "Optional: add bank UTR and payment screenshot so admin can verify faster."
                : pendingSave.paymentNote
                  ? "You can still save your registration. Optionally add UTR / screenshot if you paid another way."
                  : "Optional: add bank UTR and payment screenshot so admin can verify faster."}
            </p>

            <label className="mt-4 block text-sm">
              <span className="text-[color:var(--text-muted)]">UTR number (optional)</span>
              <input
                type="text"
                value={utrNumber}
                onChange={(e) => {
                  setUtrNumber(e.target.value);
                  if (modalError) setModalError("");
                }}
                className="input-dark mt-1.5"
                placeholder="Enter UTR number"
              />
              {modalError && /utr/i.test(modalError) ? (
                <p className="mt-1.5 text-xs text-accent">{modalError}</p>
              ) : null}
            </label>

            <label className="mt-3 block text-sm">
              <span className="text-[color:var(--text-muted)]">Payment screenshot (optional)</span>
              <input
                type="file"
                accept="image/*"
                className="mt-1.5 block w-full text-sm text-[color:var(--text-muted)] file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setScreenshotFile(file);
                  if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
                  setScreenshotPreview(file ? URL.createObjectURL(file) : "");
                }}
              />
              <p className="mt-1.5 text-xs text-[color:var(--text-muted)]">
                Please add your payment screenshot
              </p>
              {screenshotPreview ? (
                <img
                  src={screenshotPreview}
                  alt="Payment screenshot preview"
                  className="mt-3 h-28 w-auto max-w-full rounded-lg border border-[color:var(--border)] object-contain"
                />
              ) : null}
            </label>

            {modalError && !/utr/i.test(modalError) ? (
              <p className="mt-3 text-sm text-accent">{modalError}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={finishing}
                onClick={onContinueWithDetails}
                className="btn-primary"
              >
                {finishing ? "Saving..." : "Save with details"}
              </button>
              <button
                type="button"
                disabled={finishing}
                onClick={onSkipDetails}
                className="btn-ghost"
              >
                {finishing
                  ? "Saving..."
                  : pendingSave.savedRegistration
                    ? "Skip for now"
                    : "Skip and save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Field({ label, name, type = "text", required, defaultValue, minLength }) {
  return (
    <label className="block text-sm">
      <span className="text-[color:var(--text-muted)]">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        minLength={minLength}
        className="input-dark mt-1.5"
      />
    </label>
  );
}
