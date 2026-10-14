import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { AlertBanner, PageLoader, StatusPill } from "../components/ui";
import RegisterCta from "../components/RegisterCta";
import ZoomableImage from "../components/ZoomableImage";
import PaymentQrModal from "../components/PaymentQrModal";
import PlayerDocumentsModal from "../components/PlayerDocumentsModal";
import { useAuth } from "../context/AuthContext";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { playerRoleLabel } from "../data/playerRoles";
import { compressImageForUpload, paymentScreenshotUrl, profileImageUrl } from "../utils/media";
import { getPaymentStatus, paymentStatusLabel } from "../utils/paymentStatus";
import {
  buildConfirmPaymentPayload,
  openPaymentCheckout,
  paymentProviderLabel,
} from "../utils/payments";

function paymentPillTone(status) {
  const s = String(status || "pending").toLowerCase();
  if (s === "paid") return "success";
  if (s === "failed" || s === "cancelled") return "danger";
  return "warning";
}

function auctionLabel(status) {
  const s = String(status || "not_listed").toLowerCase();
  if (s === "sold") return "Sold";
  if (s === "unsold") return "Unsold";
  if (s === "not_listed") return "Not listed";
  return status;
}

function auctionPillTone(status) {
  const s = String(status || "not_listed").toLowerCase();
  if (s === "sold") return "success";
  if (s === "unsold") return "warning";
  return "muted";
}

function missingPaymentDetails(reg) {
  return !String(reg?.utrNumber || "").trim() || !paymentScreenshotUrl(reg);
}

function needsOnlinePayment(reg) {
  return getPaymentStatus(reg) !== "paid";
}


async function fetchPaymentConfigForReg(reg) {
  const interest = String(reg?.interest || "player").trim().toLowerCase();
  const qs = new URLSearchParams({ interest });
  if (interest === "sponsor" && reg?.sponsorPackageId) {
    qs.set("sponsorPackageId", String(reg.sponsorPackageId));
  }
  return api(`/api/registrations/payment-config?${qs.toString()}`);
}

function missingProfileImage(reg, brokenIds) {
  if (brokenIds.has(String(reg._id))) return true;
  return !profileImageUrl(reg);
}

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const { referralProgramEnabled, playerPayNowEnabled } = useSiteSettings();

  function canPayNow(reg) {
    return (
      playerPayNowEnabled !== false &&
      needsOnlinePayment(reg) &&
      Boolean(reg?.payNowEnabled)
    );
  }
  const navigate = useNavigate();
  const [regs, setRegs] = useState([]);
  const [regsLoading, setRegsLoading] = useState(true);
  const [regsError, setRegsError] = useState("");
  const [brokenProfileIds, setBrokenProfileIds] = useState(() => new Set());

  const [paymentModalReg, setPaymentModalReg] = useState(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState(false);
  const [payingRegId, setPayingRegId] = useState(null);

  const [profileModalReg, setProfileModalReg] = useState(null);
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [documentsModalReg, setDocumentsModalReg] = useState(null);

  const [refsOpen, setRefsOpen] = useState(false);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsError, setRefsError] = useState("");
  const [referrals, setReferrals] = useState({ playerCodes: [], referred: [], count: 0 });

  useEffect(() => {
    if (!loading && !user) navigate("/register");
    if (!loading && user?.role === "admin") navigate("/admin");
  }, [loading, user, navigate]);

  const loadRegistrations = useCallback(async () => {
    if (!user || user.role === "admin") {
      setRegs([]);
      setRegsLoading(false);
      return;
    }
    setRegsLoading(true);
    setRegsError("");
    try {
      const data = await api("/api/registrations");
      setRegs(data.registrations || []);
    } catch (err) {
      setRegs([]);
      setRegsError(err.message || "Unable to load your registrations.");
    } finally {
      setRegsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  const loadReferrals = useCallback(async () => {
    if (!user || user.role === "admin") return;
    setRefsLoading(true);
    setRefsError("");
    try {
      const data = await api("/api/registrations/referrals");
      setReferrals({
        playerCodes: data.playerCodes || [],
        referred: data.referred || [],
        count: Number(data.count || 0),
      });
    } catch (err) {
      setReferrals({ playerCodes: [], referred: [], count: 0 });
      setRefsError(err.message || "Unable to load references.");
    } finally {
      setRefsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadReferrals();
  }, [loadReferrals]);

  useEffect(() => {
    return () => {
      if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
      if (profilePreview) URL.revokeObjectURL(profilePreview);
    };
  }, [screenshotPreview, profilePreview]);

  useEffect(() => {
    if (!paymentModalReg) return;
    setUtrNumber(String(paymentModalReg.utrNumber || "").trim());
  }, [paymentModalReg]);

  function openPaymentModal(reg, feeInr) {
    const existingUtr = String(reg?.utrNumber || "").trim();
    const amountInr =
      Number(reg?.payment?.amountInr) > 0
        ? Number(reg.payment.amountInr)
        : Number(feeInr) > 0
          ? Number(feeInr)
          : null;
    setPaymentModalReg(
      amountInr != null
        ? { ...reg, payment: { ...(reg.payment || {}), amountInr } }
        : reg
    );
    setUtrNumber(existingUtr);
    setScreenshotFile(null);
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotPreview("");
    setModalError("");
  }

  async function handlePayNow(reg) {
    if (!reg?._id || payingRegId) return;
    if (!canPayNow(reg)) return;
    setRegsError("");
    setPayingRegId(String(reg._id));
    try {
      const config = await fetchPaymentConfigForReg(reg);
      const provider = config.provider || "razorpay";
      const configured = provider === "qr" ? true : Boolean(config.configured);

      if (provider === "qr") {
        openPaymentModal(reg, config.feeInr);
        return;
      }

      if (!configured) {
        throw new Error(
          `${paymentProviderLabel(provider)} is not configured on the server. Ask admin to add keys or switch to UPI QR in Admin → Settings.`
        );
      }

      if (getPaymentStatus(reg) === "paid") {
        return;
      }

      const values = {
        fullName: reg.fullName || user?.name || "",
        email: reg.email || user?.email || "",
        phone: reg.phone || user?.phone || "",
      };

      const order = await api(`/api/registrations/${reg._id}/create-payment-order`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const payment = await openPaymentCheckout(order, values);
      const confirmPayload = buildConfirmPaymentPayload(payment);
      const data = await api(`/api/registrations/${reg._id}/confirm-payment`, {
        method: "PATCH",
        body: JSON.stringify(confirmPayload),
      });

      setRegs((prev) =>
        prev.map((r) => (String(r._id) === String(data.registration._id) ? data.registration : r))
      );

      if (!payment.ok) {
        const reason = payment.reason || "Payment was not completed.";
        setRegsError(
          /cancel/i.test(reason)
            ? `${reason} Tap Pay now again to retry.`
            : `${reason} Your registration is saved with payment pending.`
        );
      }
    } catch (err) {
      setRegsError(err.message || "Unable to start payment.");
    } finally {
      setPayingRegId(null);
    }
  }

  function closePaymentModal() {
    setPaymentModalReg(null);
    setUtrNumber("");
    setScreenshotFile(null);
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotPreview("");
    setModalError("");
  }

  async function savePaymentDetails() {
    if (!paymentModalReg) return;
    setModalError("");
    setSaving(true);
    try {
      const nextUtr = utrNumber.trim();
      if (!nextUtr) {
        throw new Error("Enter the UTR number from your UPI payment.");
      }
      if (!screenshotFile && !paymentScreenshotUrl(paymentModalReg)) {
        throw new Error("Upload a screenshot of your UPI payment.");
      }

      const prevUtr = String(paymentModalReg.utrNumber || "").trim().toUpperCase();
      const utrChanged = nextUtr.toUpperCase() !== prevUtr;
      const shotChanged = Boolean(screenshotFile);

      if (!utrChanged && !shotChanged) {
        throw new Error("No payment changes to save. Update UTR or upload a new screenshot.");
      }

      const formData = new FormData();
      formData.set("fullName", paymentModalReg.fullName || user?.name || "player");
      formData.set("utrNumber", utrNumber.trim());
      if (screenshotFile) {
        formData.set("paymentScreenshot", screenshotFile);
      }

      const data = await api(`/api/registrations/${paymentModalReg._id}/payment-details`, {
        method: "PATCH",
        body: formData,
      });

      setRegs((prev) =>
        prev.map((r) => (String(r._id) === String(data.registration._id) ? data.registration : r))
      );
      closePaymentModal();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function openProfileModal(reg) {
    setProfileModalReg(reg);
    setProfileFile(null);
    if (profilePreview) URL.revokeObjectURL(profilePreview);
    setProfilePreview("");
    setProfileError("");
  }

  function closeProfileModal() {
    setProfileModalReg(null);
    setProfileFile(null);
    if (profilePreview) URL.revokeObjectURL(profilePreview);
    setProfilePreview("");
    setProfileError("");
  }

  async function saveProfilePicture() {
    if (!profileModalReg) return;
    setProfileError("");
    setSavingProfile(true);
    try {
      if (!profileFile) {
        throw new Error("Please choose a profile picture.");
      }
      const compressed = await compressImageForUpload(profileFile);
      const formData = new FormData();
      formData.set("fullName", profileModalReg.fullName || user?.name || "player");
      formData.set("photo", compressed);

      const data = await api(`/api/registrations/${profileModalReg._id}/profile-image`, {
        method: "PATCH",
        body: formData,
      });

      setRegs((prev) =>
        prev.map((r) => (String(r._id) === String(data.registration._id) ? data.registration : r))
      );
      setBrokenProfileIds((prev) => {
        const next = new Set(prev);
        next.delete(String(data.registration._id));
        return next;
      });
      closeProfileModal();
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  if (loading || !user || user.role === "admin") {
    return (
      <section className="bg-ink px-4 py-8">
        <PageLoader message="Loading dashboard…" />
      </section>
    );
  }

  return (
    <section className="bg-ink px-4 py-8 md:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow text-accent">Dashboard</p>
            <h1 className="page-title mt-1">Hello, {user.name.split(" ")[0]}</h1>
            <p className="truncate text-sm text-[color:var(--text-muted)]">{user.email}</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            {referralProgramEnabled || referrals.count > 0 ? (
              <button
                type="button"
                className="btn-primary !py-2 !text-xs col-span-2 sm:col-span-1"
                onClick={() => {
                  setRefsOpen(true);
                  loadReferrals();
                }}
              >
                References{referrals.count ? ` (${referrals.count})` : ""}
              </button>
            ) : null}
            <RegisterCta
              className="btn-ghost !py-2 !text-xs w-full justify-center sm:w-auto"
              openLabel="Registration"
              closedLabel="Registration"
            />
            <button
              type="button"
              className="btn-ghost !py-2 !text-xs w-full justify-center sm:w-auto"
              onClick={async () => {
                await logout();
                navigate("/");
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          {regsLoading ? (
            <PageLoader message="Loading your registrations…" />
          ) : regsError ? (
            <div className="panel space-y-3 rounded-2xl p-5">
              <AlertBanner tone="error">{regsError}</AlertBanner>
              <button type="button" className="btn-primary" onClick={loadRegistrations}>
                Try again
              </button>
            </div>
          ) : regs.length === 0 ? (
            <div className="panel rounded-2xl p-5 text-sm text-[color:var(--text-muted)]">
              No registrations yet. Complete player registration to see your status, payment, and auction details here.{" "}
              <RegisterCta className="text-accent" openLabel="Register now" closedLabel="Registration" />
            </div>
          ) : (
            regs.map((reg) => {
              const imgUrl = profileImageUrl(reg);
              const needsPhoto = missingProfileImage(reg, brokenProfileIds);
              return (
                <div key={reg._id} className="panel rounded-2xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {imgUrl && !brokenProfileIds.has(String(reg._id)) ? (
                        <button
                          type="button"
                          className="shrink-0 rounded-lg border border-[color:var(--border)] p-0"
                          title="Change profile picture"
                          onClick={() => openProfileModal(reg)}
                        >
                          <ZoomableImage
                            src={imgUrl}
                            alt={reg.fullName}
                            className="h-14 w-14 rounded-lg object-cover"
                            onError={() => {
                              setBrokenProfileIds((prev) => new Set(prev).add(String(reg._id)));
                            }}
                          />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-accent/40 bg-ink-soft text-[10px] font-semibold uppercase leading-tight text-accent-soft"
                          onClick={() => openProfileModal(reg)}
                        >
                          Add photo
                        </button>
                      )}
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-[color:var(--title)]">{reg.fullName}</p>
                        {reg.playerCode ? (
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
                            Player ID: {reg.playerCode}
                          </p>
                        ) : null}
                        <p className="text-sm text-[color:var(--text-muted)]">
                          {reg.company}
                          {reg.designation ? ` · ${reg.designation}` : ""}
                          {reg.interest === "player" || reg.interest === "captain"
                            ? ` · ${playerRoleLabel(reg.role)}`
                            : ""}
                          {reg.interest ? ` · ${reg.interest}` : ""}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <StatusPill tone={paymentPillTone(getPaymentStatus(reg))}>
                            {paymentStatusLabel(getPaymentStatus(reg))}
                            {reg.payment?.amountInr ? ` · ₹${reg.payment.amountInr}` : ""}
                          </StatusPill>
                          <StatusPill tone={auctionPillTone(reg.auctionStatus)}>
                            Auction: {auctionLabel(reg.auctionStatus)}
                            {reg.franchiseName ? ` · ${reg.franchiseName}` : ""}
                          </StatusPill>
                          <StatusPill tone="muted">{reg.status}</StatusPill>
                        </div>
                        {(reg.utrNumber || paymentScreenshotUrl(reg)) && (
                          <p className="mt-3 text-sm text-[color:var(--text-muted)]">
                            {reg.utrNumber ? `UTR: ${reg.utrNumber}` : "UTR: —"}
                            {" · "}
                            {paymentScreenshotUrl(reg) ? (
                              <a
                                href={paymentScreenshotUrl(reg)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-accent-soft underline"
                              >
                                Payment screenshot
                              </a>
                            ) : (
                              <span>No payment screenshot</span>
                            )}
                          </p>
                        )}
                        {((Number(reg.basePrice) > 0) || (Number(reg.soldPrice) > 0)) && (
                          <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                            {Number(reg.basePrice) > 0 ? `Base ₹${reg.basePrice}` : ""}
                            {Number(reg.soldPrice) > 0
                              ? `${Number(reg.basePrice) > 0 ? " · " : ""}Sold ₹${reg.soldPrice}`
                              : ""}
                          </p>
                        )}
                        {reg.referredByPlayerCode ? (
                          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                            Referred by Player ID: {reg.referredByPlayerCode}
                            {reg.referredByName ? ` · ${reg.referredByName}` : ""}
                          </p>
                        ) : null}
                        {reg.paymentDetailsAddedBy || reg.paymentDetailsAddedAt ? (
                          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                            Payment details by {reg.paymentDetailsAddedBy || "—"}
                            {reg.paymentDetailsAddedAt
                              ? ` · ${new Date(reg.paymentDetailsAddedAt).toLocaleString()}`
                              : ""}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[color:var(--border)] pt-4">
                    {reg.interest === "franchise" &&
                    reg.status === "verified" &&
                    getPaymentStatus(reg) === "paid" &&
                    reg.franchiseId ? (
                      <Link to="/dashboard/players" className="btn-primary !py-2 !text-xs">
                        Players list
                      </Link>
                    ) : null}
                    {needsPhoto ? (
                      <button
                        type="button"
                        className="btn-ghost !py-2 !text-xs"
                        onClick={() => openProfileModal(reg)}
                      >
                        Add profile picture
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-ghost !py-2 !text-xs"
                        onClick={() => openProfileModal(reg)}
                      >
                        Change profile picture
                      </button>
                    )}
                    {canPayNow(reg) ? (
                      <button
                        type="button"
                        className="btn-primary !py-2 !text-xs"
                        disabled={payingRegId === String(reg._id)}
                        onClick={() => handlePayNow(reg)}
                      >
                        {payingRegId === String(reg._id) ? "Processing…" : "Pay now"}
                      </button>
                    ) : null}
                    {!needsOnlinePayment(reg) && missingPaymentDetails(reg) ? (
                      <button
                        type="button"
                        className="btn-ghost !py-2 !text-xs"
                        onClick={() => openPaymentModal(reg)}
                      >
                        Add payment details
                      </button>
                    ) : null}
                    {reg.showAddDocumentsButton ? (
                      <button
                        type="button"
                        className="btn-primary !py-2 !text-xs"
                        onClick={() => setDocumentsModalReg(reg)}
                      >
                        Add documents
                      </button>
                    ) : null}
                  </div>
                  {reg.showAddDocumentsButton ? (
                    <p className="mt-3 rounded-lg border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                      Please upload the documents for the further process.
                    </p>
                  ) : reg.documentsVerificationStatus === "verified" ? (
                    <p className="mt-3 rounded-lg border border-emerald-400/35 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                      {reg.documentsVerificationLabel || "Document verification completed."}
                    </p>
                  ) : reg.documentsVerificationStatus === "rejected" ? (
                    <p className="mt-3 rounded-lg border border-accent/35 bg-accent/10 px-3 py-2 text-sm text-accent-soft">
                      {reg.documentsVerificationLabel || "Document verification rejected."}
                      {(reg.documentsRequestedFromPlayer || []).length
                        ? " Please upload the documents requested by admin."
                        : " Contact admin if you need help."}
                    </p>
                  ) : reg.documentsComplete || reg.documentsVerificationStatus === "in_progress" ? (
                    <p className="mt-3 rounded-lg border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                      {reg.documentsVerificationLabel || "Document verification in progress."}
                    </p>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      {profileModalReg ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dash-profile-pic-title"
            className="panel w-full max-w-md rounded-2xl p-5"
          >
            <p className="eyebrow text-accent">Profile picture</p>
            <h2
              id="dash-profile-pic-title"
              className="mt-1 font-display text-2xl text-[color:var(--title)]"
            >
              {profileModalReg.fullName}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">
              Upload or replace your registration profile photo (JPG, PNG, or WEBP).
            </p>

            <label className="mt-4 block text-sm">
              <span className="text-[color:var(--text-muted)]">Profile picture</span>
              <input
                type="file"
                accept="image/*"
                className="mt-1.5 block w-full text-sm text-[color:var(--text-muted)] file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setProfileFile(file);
                  if (profilePreview) URL.revokeObjectURL(profilePreview);
                  setProfilePreview(file ? URL.createObjectURL(file) : "");
                  if (profileError) setProfileError("");
                }}
              />
              {profilePreview ? (
                <img
                  src={profilePreview}
                  alt="Profile preview"
                  className="mt-3 h-28 w-28 rounded-lg border border-[color:var(--border)] object-cover"
                />
              ) : null}
            </label>

            {profileError ? <p className="mt-3 text-sm text-accent">{profileError}</p> : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={savingProfile}
                onClick={saveProfilePicture}
                className="btn-primary"
              >
                {savingProfile ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                disabled={savingProfile}
                onClick={closeProfileModal}
                className="btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {refsOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dash-references-title"
            className="panel max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-5"
          >
            <p className="eyebrow text-accent">Referral program</p>
            <h2 id="dash-references-title" className="mt-1 font-display text-2xl text-[color:var(--title)]">
              References
            </h2>
            {referralProgramEnabled && referrals.playerCodes.length ? (
              <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                Share your Player ID{" "}
                <strong className="text-accent">{referrals.playerCodes.join(", ")}</strong> so
                others can enter it as an optional referral code at registration.
              </p>
            ) : (
              <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                Players who registered using your Player ID appear here.
              </p>
            )}

            {refsError ? (
              <div className="mt-4">
                <AlertBanner tone="error">{refsError}</AlertBanner>
              </div>
            ) : null}

            {refsLoading ? (
              <p className="mt-4 text-sm text-[color:var(--text-muted)]">Loading references…</p>
            ) : referrals.referred.length === 0 ? (
              <p className="mt-4 rounded-lg border border-[color:var(--border)] bg-ink-soft px-4 py-3 text-sm text-[color:var(--text-muted)]">
                No references yet.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                  {referrals.count} referred player{referrals.count === 1 ? "" : "s"}
                </p>
                {referrals.referred.map((row) => (
                  <article
                    key={row._id}
                    className="rounded-lg border border-[color:var(--border)] bg-ink-soft px-4 py-3"
                  >
                    <p className="font-semibold text-[color:var(--title)]">{row.fullName}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      Player ID: {row.playerCode || "—"}
                      {row.interest ? ` · ${row.interest}` : ""}
                      {row.status ? ` · ${row.status}` : ""}
                    </p>
                    {row.createdAt ? (
                      <p className="mt-1 text-[11px] text-[color:var(--text-muted)]">
                        {new Date(row.createdAt).toLocaleString()}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}

            <div className="mt-5">
              <button type="button" className="btn-ghost" onClick={() => setRefsOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {documentsModalReg ? (
        <PlayerDocumentsModal
          registration={documentsModalReg}
          onClose={() => setDocumentsModalReg(null)}
          onSaved={(updated) => {
            setRegs((prev) =>
              prev.map((r) => (String(r._id) === String(updated._id) ? updated : r))
            );
            setDocumentsModalReg(updated);
          }}
        />
      ) : null}

      <PaymentQrModal
        open={Boolean(paymentModalReg)}
        playerCode={paymentModalReg?.playerCode}
        amountInr={paymentModalReg?.payment?.amountInr}
        utrNumber={utrNumber}
        onUtrChange={(value) => {
          setUtrNumber(value);
          if (modalError) setModalError("");
        }}
        screenshotFile={screenshotFile}
        screenshotPreview={screenshotPreview}
        existingScreenshotUrl={paymentScreenshotUrl(paymentModalReg)}
        onScreenshotChange={(file) => {
          setScreenshotFile(file);
          if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
          setScreenshotPreview(file ? URL.createObjectURL(file) : "");
          if (modalError) setModalError("");
        }}
        error={modalError}
        submitting={saving}
        submitLabel="Save"
        onSubmit={savePaymentDetails}
        onClose={closePaymentModal}
      />
    </section>
  );
}
