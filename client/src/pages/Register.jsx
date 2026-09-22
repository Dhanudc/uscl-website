import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import PasswordInput from "../components/PasswordInput";
import PlayerDataConsentForm from "../components/PlayerDataConsentForm";
import { AlertBanner, EmptyState, PageLoader } from "../components/ui";
import RegistrationComingSoon from "../components/RegistrationComingSoon";
import PaymentQrModal from "../components/PaymentQrModal";
import ZoomableImage from "../components/ZoomableImage";
import { useAuth } from "../context/AuthContext";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { PLAYER_DATA_CONSENT } from "../data/playerDataConsent";
import { PLAYER_ROLES, playerRoleLabel } from "../data/playerRoles";
import { compressImageForUpload, paymentScreenshotUrl, profileImageUrl } from "../utils/media";
import { getPaymentStatus, paymentStatusLabel } from "../utils/paymentStatus";
import {
  buildConfirmPaymentPayload,
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
  const { registrationEnabled, referralProgramEnabled, loading: settingsLoading } = useSiteSettings();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [existing, setExisting] = useState(null);
  const [existingLoaded, setExistingLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState("");
  const [feeInr, setFeeInr] = useState(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState("");
  const [paymentProvider, setPaymentProvider] = useState("razorpay");
  const [paymentConfigured, setPaymentConfigured] = useState(true);
  const pendingSaveRef = useRef(null);
  const isQrPayment = paymentProvider === "qr";
  /** Set from the pre-register popup: captain | player | franchise | sponsor */
  const [registerInterest, setRegisterInterest] = useState(null);
  const [sponsorPackageId, setSponsorPackageId] = useState("");
  const [sponsorPackageTitle, setSponsorPackageTitle] = useState("");
  const [showTypePicker, setShowTypePicker] = useState(true);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [paymentStepReg, setPaymentStepReg] = useState(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [payModalOpen, setPayModalOpen] = useState(false);
  const formRef = useRef(null);

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
        setPaymentProvider(data.provider || "razorpay");
        setPaymentConfigured(data.provider === "qr" ? true : Boolean(data.configured));
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
      setPaymentStepReg(null);
      setExistingLoaded(true);
      return;
    }
    setExistingLoaded(false);
    Promise.all([api("/api/registrations"), api("/api/registrations/payment-config")])
      .then(([data, config]) => {
        const provider = config.provider || "razorpay";
        setPaymentProvider(provider);
        setPaymentConfigured(provider === "qr" ? true : Boolean(config.configured));

        const first = data.registrations?.[0] || null;
        if (!first) {
          setExisting(null);
          setPaymentStepReg(null);
          return;
        }
        const hasProof =
          Boolean(String(first.utrNumber || "").trim()) && Boolean(paymentScreenshotUrl(first));
        if (getPaymentStatus(first) === "paid" || hasProof) {
          setExisting(first);
          setPaymentStepReg(null);
          return;
        }
        if (provider === "qr") {
          setExisting(null);
          setPaymentStepReg(first);
          setPayModalOpen(true);
          if (first.interest) {
            setRegisterInterest(first.interest);
            setShowTypePicker(false);
          }
          if (first.sponsorPackageId) setSponsorPackageId(String(first.sponsorPackageId));
          return;
        }
        setExisting(first);
        setPaymentStepReg(null);
        if (first.interest) {
          setRegisterInterest(first.interest);
          setShowTypePicker(false);
        }
        if (first.sponsorPackageId) setSponsorPackageId(String(first.sponsorPackageId));
      })
      .catch(() => {
        setExisting(null);
        setPaymentStepReg(null);
      })
      .finally(() => setExistingLoaded(true));
  }, [user]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
      if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    };
  }, [preview, screenshotPreview]);

  function clearPendingSession() {
    pendingSaveRef.current = null;
  }

  async function createRegistration(values, photoFile, agreedToTerms) {
    const formData = new FormData();
    formData.set("fullName", values.fullName);
    formData.set("email", values.email);
    formData.set("phone", values.phone);
    formData.set("company", values.company);
    formData.set("designation", values.designation || "");
    formData.set("role", values.role);
    formData.set("interest", values.interest);
    if (values.sponsorPackageId) {
      formData.set("sponsorPackageId", values.sponsorPackageId);
    }
    formData.set("agreedToTerms", agreedToTerms ? "true" : "false");
    formData.set("paymentStatus", "pending");
    formData.set("photo", photoFile);
    if (values.referralPlayerCode) {
      formData.set("referralPlayerCode", values.referralPlayerCode);
    }

    const data = await api("/api/registrations", {
      method: "POST",
      body: formData,
    });
    return data.registration;
  }

  async function findOrCreateRegistration(values, compressedPhoto, agreedToTerms, interest) {
    try {
      return await createRegistration(values, compressedPhoto, agreedToTerms);
    } catch (createErr) {
      if (/already have an active/i.test(createErr.message || "")) {
        const data = await api("/api/registrations");
        const registration =
          (data.registrations || []).find((r) => r.interest === interest) ||
          data.registrations?.[0] ||
          null;
        if (!registration) throw createErr;
        return registration;
      }
      throw createErr;
    }
  }

  function readFormValues(form) {
    const photoFile = form.photo.files?.[0];
    if (!photoFile) {
      throw new Error("Please upload a photo.");
    }

    const needsPlayingRole =
      registerInterest === "player" || registerInterest === "captain";
    const interest = registerInterest || "player";
    const role = needsPlayingRole ? form.role.value.trim() : interest;

    if (!registerInterest) {
      throw new Error("Please choose Captain, Player, Franchise, or Sponsor first.");
    }
    if (registerInterest === "sponsor" && !sponsorPackageId) {
      throw new Error("Please choose a sponsor package on the Sponsors page first.");
    }
    if (needsPlayingRole && !role) {
      throw new Error("Please select a playing role.");
    }

    const agreedToTerms = form.agreedToTerms.checked;
    if (!agreedToTerms) {
      throw new Error(
        "Please read and agree to the USCL Player Data Processing & Sharing Consent."
      );
    }

    return {
      photoFile,
      agreedToTerms,
      interest,
      values: {
        fullName: form.fullName.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        password: form.password?.value || "",
        company: form.company.value.trim(),
        designation: form.designation?.value?.trim() || "",
        role,
        interest,
        sponsorPackageId: registerInterest === "sponsor" ? sponsorPackageId : "",
        referralPlayerCode: form.referralPlayerCode?.value?.trim() || "",
      },
    };
  }

  async function handlePayNow() {
    const form = formRef.current;
    if (!form) return;
    setError("");
    if (!form.reportValidity()) return;
    setSubmitting(true);

    let savedRegistration = null;

    try {
      const { photoFile, agreedToTerms, interest, values } = readFormValues(form);
      const compressedPhoto = await compressImageForUpload(photoFile);

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

      const registration = await findOrCreateRegistration(
        values,
        compressedPhoto,
        agreedToTerms,
        interest
      );
      savedRegistration = registration;

      if (isQrPayment) {
        setPaymentStepReg(registration);
        setPayModalOpen(true);
        clearPendingSession();
        return;
      }

      if (!paymentConfigured) {
        setExisting(registration);
        throw new Error(
          `${paymentProviderLabel(paymentProvider)} is not configured on the server. Ask admin to add keys or switch to UPI QR.`
        );
      }

      if (getPaymentStatus(registration) === "paid") {
        setExisting(registration);
        setPaymentStepReg(null);
        setPayModalOpen(false);
        clearPendingSession();
        return;
      }

      const order = await api(`/api/registrations/${registration._id}/create-payment-order`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const payment = await openPaymentCheckout(order, values);
      const confirmPayload = buildConfirmPaymentPayload(payment);
      const data = await api(`/api/registrations/${registration._id}/confirm-payment`, {
        method: "PATCH",
        body: JSON.stringify(confirmPayload),
      });

      setExisting(data.registration);
      setPaymentStepReg(null);
      setPayModalOpen(false);
      clearPendingSession();

      if (!payment.ok) {
        const reason = payment.reason || "Payment was not completed.";
        setError(
          /cancel/i.test(reason)
            ? `${reason} Your registration is saved — tap Pay now again to retry payment.`
            : `${reason} Your registration is saved with payment pending.`
        );
        return;
      }
    } catch (err) {
      if (savedRegistration && !isQrPayment) {
        setExisting(savedRegistration);
      }
      setError(err.message);
      clearPendingSession();
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function savePaymentProof() {
    setError("");
    setSubmitting(true);

    try {
      if (!paymentStepReg?._id) {
        throw new Error("Tap Pay now to save your registration first.");
      }
      const utr = utrNumber.trim();
      if (!utr) {
        throw new Error("Enter the UTR number from your UPI payment.");
      }
      if (!screenshotFile) {
        throw new Error("Upload a screenshot of your UPI payment.");
      }

      const compressedScreenshot = await compressImageForUpload(screenshotFile);
      const formData = new FormData();
      formData.set("fullName", paymentStepReg.fullName || user?.name || "player");
      formData.set("utrNumber", utr);
      formData.set("paymentScreenshot", compressedScreenshot);

      const data = await api(`/api/registrations/${paymentStepReg._id}/payment-details`, {
        method: "PATCH",
        body: formData,
      });

      setExisting(data.registration);
      setPaymentStepReg(null);
      setPayModalOpen(false);
      clearPendingSession();
    } catch (err) {
      setError(err.message);
      clearPendingSession();
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

  if (!registrationEnabled && !existing && !paymentStepReg) {
    return <RegistrationComingSoon />;
  }

  return (
    <section className="bg-ink px-4 py-8 md:py-10">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow text-accent">Player Registration</p>
        <h1 className="page-title mt-1.5 text-accent">Register. Get Auctioned. Enter into USCL.</h1>

        {existing ? (
          <div className="panel mt-5 space-y-3 rounded-lg p-5">
            <AlertBanner tone={getPaymentStatus(existing) === "paid" ? "ok" : "info"}>
              {getPaymentStatus(existing) === "paid"
                ? "Registration successful. Payment received and a confirmation email has been sent."
                : "Registration saved. Admin will mark it paid after confirming your UTR and screenshot."}
            </AlertBanner>
            {error && getPaymentStatus(existing) !== "paid" ? (
              <AlertBanner tone="error">{error}</AlertBanner>
            ) : null}
            <p className="font-display text-xl text-[color:var(--title)]">
              {getPaymentStatus(existing) === "paid"
                ? "Registration successful"
                : "Registration saved — payment pending"}
            </p>
            <p className="text-sm text-[color:var(--text-muted)]">
              Status: <strong className="uppercase text-accent">{existing.status}</strong>
              {existing.playerCode ? (
                <>
                  {" · "}
                  Player ID: <strong className="text-accent">{existing.playerCode}</strong>
                </>
              ) : null}
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
                {existing.referredByPlayerCode ? (
                  <p>
                    Referred by Player ID:{" "}
                    <strong className="text-accent">{existing.referredByPlayerCode}</strong>
                    {existing.referredByName ? ` · ${existing.referredByName}` : ""}
                  </p>
                ) : null}
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
              {getPaymentStatus(existing) === "paid" ? "Open Dashboard" : "Open Dashboard"}
            </Link>
          </div>
        ) : registerInterest ? (
          <form
            ref={formRef}
            onSubmit={(e) => {
              e.preventDefault();
              if (paymentStepReg) savePaymentProof();
            }}
            encType="multipart/form-data"
            className="panel mt-8 grid gap-3 rounded-2xl p-6 sm:grid-cols-2"
          >
            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color:var(--border)] bg-ink-soft px-3 py-2">
              <p className="text-sm text-[color:var(--text)]">
                Registering as{" "}
                <strong className="uppercase text-accent">{registerInterest}</strong>
              </p>
              {!paymentStepReg ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-accent-soft underline"
                  onClick={() => {
                    setRegisterInterest(null);
                    setSponsorPackageId("");
                    setSponsorPackageTitle("");
                    setShowTypePicker(true);
                    setUtrNumber("");
                    setScreenshotFile(null);
                    setScreenshotPreview((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return "";
                    });
                  }}
                >
                  Change
                </button>
              ) : null}
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
            {referralProgramEnabled ? (
              <label className="block text-sm sm:col-span-2">
                <span className="text-[color:var(--text-muted)]">Referral code (optional)</span>
                <input
                  name="referralPlayerCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  defaultValue={searchParams.get("ref") || ""}
                  placeholder="e.g. 0001"
                  className="input-dark mt-1.5"
                />
                <span className="mt-1.5 block text-xs text-[color:var(--text-muted)]">
                  Enter the Player ID of the person who referred you. Leave blank if nobody referred you.
                </span>
              </label>
            ) : null}
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
                {isQrPayment
                  ? "Tap Pay now to save your registration, then scan the UPI QR, enter UTR, and upload your payment screenshot. Admin will confirm payment."
                  : paymentConfigured
                    ? `Tap Pay now to save your registration, then pay via ${paymentProviderLabel(paymentProvider)}. Payment is linked to your saved registration.`
                    : `${paymentProviderLabel(paymentProvider)} keys are missing on the server — ask admin to configure them or switch to UPI QR.`}
              </p>
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

            {!paymentStepReg || !isQrPayment ? (
              <button
                type="button"
                disabled={
                  submitting ||
                  feeLoading ||
                  feeInr == null ||
                  (!isQrPayment && !paymentConfigured)
                }
                className="btn-primary sm:col-span-2"
                onClick={handlePayNow}
              >
                {submitting
                  ? isQrPayment
                    ? "Saving registration..."
                    : "Processing payment..."
                  : feeLoading || feeInr == null
                    ? "Loading fee…"
                    : `Pay now ₹${feeInr.toLocaleString("en-IN")}`}
              </button>
            ) : (
              <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
                <p className="text-sm text-[color:var(--text)]">
                  Registration saved
                  {paymentStepReg.playerCode ? ` · Player ID ${paymentStepReg.playerCode}` : ""}.
                  Complete UPI payment in the popup.
                </p>
                <button
                  type="button"
                  className="btn-primary !py-2 !text-xs"
                  onClick={() => setPayModalOpen(true)}
                >
                  Open payment
                </button>
              </div>
            )}
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

      <PaymentQrModal
        open={isQrPayment && Boolean(paymentStepReg) && payModalOpen}
        playerCode={paymentStepReg?.playerCode}
        amountInr={feeInr ?? paymentStepReg?.payment?.amountInr}
        utrNumber={utrNumber}
        onUtrChange={setUtrNumber}
        screenshotFile={screenshotFile}
        screenshotPreview={screenshotPreview}
        onScreenshotChange={(file) => {
          setScreenshotFile(file);
          setScreenshotPreview((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return file ? URL.createObjectURL(file) : "";
          });
        }}
        error={error}
        submitting={submitting}
        submitLabel="Register"
        onSubmit={savePaymentProof}
        onClose={() => setPayModalOpen(false)}
      />

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
