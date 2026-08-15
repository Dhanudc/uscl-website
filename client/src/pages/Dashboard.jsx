import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import ZoomableImage from "../components/ZoomableImage";
import { useAuth } from "../context/AuthContext";
import { playerRoleLabel } from "../data/playerRoles";
import { paymentScreenshotUrl, profileImageUrl } from "../utils/media";
import { getPaymentStatus, paymentStatusLabel } from "../utils/paymentStatus";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function missingPaymentDetails(reg) {
  return !String(reg?.utrNumber || "").trim() || !paymentScreenshotUrl(reg);
}

function needsOnlinePayment(reg) {
  return Boolean(reg?.payNowEnabled) && getPaymentStatus(reg) !== "paid";
}

function missingProfileImage(reg, brokenIds) {
  if (brokenIds.has(String(reg._id))) return true;
  return !profileImageUrl(reg);
}

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [regs, setRegs] = useState([]);
  const [brokenProfileIds, setBrokenProfileIds] = useState(() => new Set());
  const [payError, setPayError] = useState("");
  const [payErrorId, setPayErrorId] = useState("");
  const [payingId, setPayingId] = useState("");

  const [paymentModalReg, setPaymentModalReg] = useState(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState(false);

  const [profileModalReg, setProfileModalReg] = useState(null);
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/register");
    if (!loading && user?.role === "admin") navigate("/admin");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user || user.role === "admin") return;
    api("/api/registrations")
      .then((data) => setRegs(data.registrations || []))
      .catch(() => {});
  }, [user]);

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

  async function openRazorpayCheckout(order, values) {
    const ready = await loadRazorpayScript();
    if (!ready || !window.Razorpay) {
      throw new Error("Unable to load Razorpay checkout.");
    }

    return new Promise((resolve) => {
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "USCL T20",
        description: "Player registration fee",
        order_id: order.orderId,
        prefill: {
          name: values.fullName,
          email: values.email,
          contact: values.phone,
        },
        theme: { color: "#ff3d2e" },
        handler: (response) =>
          resolve({
            ok: true,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }),
        modal: {
          ondismiss: () =>
            resolve({
              ok: false,
              reason: "Payment cancelled.",
            }),
        },
      });
      rzp.on("payment.failed", (resp) => {
        resolve({
          ok: false,
          reason: resp?.error?.description || "Payment failed.",
        });
      });
      rzp.open();
    });
  }

  async function payRegistration(reg) {
    if (!reg?._id || payingId) return;
    setPayError("");
    setPayErrorId("");
    setPayingId(String(reg._id));
    try {
      const order = await api(`/api/registrations/${reg._id}/create-payment-order`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      const payment = await openRazorpayCheckout(order, {
        fullName: reg.fullName || user?.name || "",
        email: reg.email || user?.email || "",
        phone: reg.phone || user?.phone || "",
      });

      let payload;
      if (payment.ok) {
        payload = {
          razorpayOrderId: payment.razorpay_order_id,
          razorpayPaymentId: payment.razorpay_payment_id,
          razorpaySignature: payment.razorpay_signature,
          paymentStatus: "paid",
        };
      } else {
        const reason = payment.reason || "Payment failed.";
        payload = {
          paymentStatus: /cancel/i.test(reason) ? "cancelled" : "failed",
        };
      }

      const data = await api(`/api/registrations/${reg._id}/confirm-payment`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setRegs((prev) =>
        prev.map((r) => (String(r._id) === String(data.registration._id) ? data.registration : r))
      );

      if (payment.ok && missingPaymentDetails(data.registration)) {
        openPaymentModal(data.registration);
      } else if (!payment.ok) {
        setPayErrorId(String(reg._id));
        setPayError(payment.reason || "Payment was not completed.");
      }
    } catch (err) {
      setPayErrorId(String(reg._id));
      setPayError(err.message || "Unable to start payment.");
    } finally {
      setPayingId("");
    }
  }

  function openPaymentModal(reg) {
    const existingUtr = String(reg?.utrNumber || "").trim();
    setPaymentModalReg(reg);
    setUtrNumber(existingUtr);
    setScreenshotFile(null);
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotPreview("");
    setModalError("");
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
      const nextUtr = utrNumber.trim().toUpperCase();
      const prevUtr = String(paymentModalReg.utrNumber || "").trim().toUpperCase();
      const utrChanged = Boolean(nextUtr) && nextUtr !== prevUtr;
      const shotChanged = Boolean(screenshotFile);

      if (!utrChanged && !shotChanged) {
        throw new Error("No payment changes to save. Update UTR or upload a new screenshot.");
      }

      if (!utrNumber.trim() && !screenshotFile && !paymentScreenshotUrl(paymentModalReg)) {
        throw new Error("Please add a UTR number or payment screenshot.");
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
      const formData = new FormData();
      formData.set("fullName", profileModalReg.fullName || user?.name || "player");
      formData.set("photo", profileFile);

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
    return <section className="px-4 py-20 text-center text-[color:var(--text-muted)]">Loading...</section>;
  }

  return (
    <section className="bg-ink px-4 py-8 md:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-accent">Dashboard</p>
            <h1 className="page-title mt-1">Hello, {user.name.split(" ")[0]}</h1>
            <p className="text-sm text-[color:var(--text-muted)]">{user.email}</p>
          </div>
          <div className="flex gap-2">
            <Link to="/register" className="btn-ghost !py-2 !text-xs">
              Registration
            </Link>
            <button
              type="button"
              className="btn-ghost !py-2 !text-xs"
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
          {regs.length === 0 ? (
            <div className="panel rounded-2xl p-5 text-sm text-[color:var(--text-muted)]">
              No registrations yet. <Link to="/register" className="text-accent">Register now</Link>
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
                        <ZoomableImage
                          src={imgUrl}
                          alt={reg.fullName}
                          className="h-14 w-14 shrink-0 rounded-lg border border-[color:var(--border)] object-cover"
                          onError={() => {
                            setBrokenProfileIds((prev) => new Set(prev).add(String(reg._id)));
                          }}
                        />
                      ) : (
                        <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[color:var(--border)] bg-ink-soft text-xs text-[color:var(--text-muted)]">
                          No photo
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-[color:var(--title)]">{reg.fullName}</p>
                        <p className="text-sm text-[color:var(--text-muted)]">
                          {reg.company} · {playerRoleLabel(reg.role)} · {reg.interest}
                        </p>
                        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                          Payment:{" "}
                          <span className="uppercase text-accent-soft">
                            {paymentStatusLabel(getPaymentStatus(reg))}
                          </span>
                          {reg.payment?.amountInr ? ` · ₹${reg.payment.amountInr}` : ""}
                          {reg.payment?.paymentId ? ` · ${reg.payment.paymentId}` : ""}
                        </p>
                        {reg.utrNumber || paymentScreenshotUrl(reg) ? (
                          <p className="mt-2 text-sm text-[color:var(--text-muted)]">
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
                        ) : null}
                        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                          Auction:{" "}
                          <span className="uppercase text-accent-soft">
                            {reg.auctionStatus || "not_listed"}
                          </span>
                          {reg.franchiseName ? ` · ${reg.franchiseName}` : ""}
                          {reg.basePrice ? ` · Base ₹${reg.basePrice}` : ""}
                          {reg.soldPrice ? ` · Sold ₹${reg.soldPrice}` : ""}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {needsPhoto ? (
                            <button
                              type="button"
                              className="btn-primary !py-2 !text-xs"
                              onClick={() => openProfileModal(reg)}
                            >
                              Add profile picture
                            </button>
                          ) : null}
                          {needsOnlinePayment(reg) ? (
                            <button
                              type="button"
                              className="btn-primary !py-2 !text-xs"
                              disabled={payingId === String(reg._id)}
                              onClick={() => payRegistration(reg)}
                            >
                              {payingId === String(reg._id) ? "Opening payment..." : "Pay now"}
                            </button>
                          ) : null}
                          {missingPaymentDetails(reg) ? (
                            <button
                              type="button"
                              className="btn-primary !py-2 !text-xs"
                              onClick={() => openPaymentModal(reg)}
                            >
                              Add payment details
                            </button>
                          ) : null}
                        </div>
                        {payError && payErrorId === String(reg._id) ? (
                          <p className="mt-2 text-xs text-accent">{payError}</p>
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
                    <span className="rounded-full border border-accent/40 px-3 py-1 text-[10px] font-bold uppercase text-accent-soft">
                      {reg.status}
                    </span>
                  </div>
                  {reg.adminNotes && (
                    <p className="mt-3 text-sm text-[color:var(--text-muted)]">Admin note: {reg.adminNotes}</p>
                  )}
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
              Upload a profile photo.
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

      {paymentModalReg ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dash-payment-details-title"
            className="panel w-full max-w-md rounded-2xl p-5"
          >
            <p className="eyebrow text-accent">Payment details</p>
            <h2
              id="dash-payment-details-title"
              className="mt-1 font-display text-2xl text-[color:var(--title)]"
            >
              {paymentModalReg.fullName}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">
              Add UTR and payment screenshot. You can update either or both.
            </p>

            <label className="mt-4 block text-sm">
              <span className="text-[color:var(--text-muted)]">UTR number</span>
              <input
                type="text"
                value={utrNumber}
                onChange={(e) => {
                  setUtrNumber(e.target.value);
                  if (modalError) setModalError("");
                }}
                className="input-dark mt-1.5"
                placeholder="Enter UTR number"
                autoComplete="off"
              />
              {modalError && /utr/i.test(modalError) ? (
                <p className="mt-1.5 text-xs text-accent">{modalError}</p>
              ) : null}
            </label>

            <label className="mt-3 block text-sm">
              <span className="text-[color:var(--text-muted)]">Payment screenshot</span>
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
              ) : paymentScreenshotUrl(paymentModalReg) ? (
                <img
                  src={paymentScreenshotUrl(paymentModalReg)}
                  alt="Current payment screenshot"
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
                disabled={saving}
                onClick={savePaymentDetails}
                className="btn-primary"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={closePaymentModal}
                className="btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
