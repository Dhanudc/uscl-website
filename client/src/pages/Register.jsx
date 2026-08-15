import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import PasswordInput from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";
import { PLAYER_ROLES, playerRoleLabel } from "../data/playerRoles";
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

export default function Register() {
  const { user, loading, refresh } = useAuth();
  const [error, setError] = useState("");
  const [existing, setExisting] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState("");
  const [feeInr, setFeeInr] = useState(999);
  const [paymentConfigured, setPaymentConfigured] = useState(true);
  const [pendingSave, setPendingSave] = useState(null);
  const pendingSaveRef = useRef(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [modalError, setModalError] = useState("");
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    api("/api/registrations/payment-config")
      .then((data) => {
        setFeeInr(data.feeInr || 999);
        setPaymentConfigured(Boolean(data.configured));
      })
      .catch(() => setPaymentConfigured(false));
  }, []);

  useEffect(() => {
    if (!user) {
      setExisting(null);
      return;
    }
    api("/api/registrations")
      .then((data) => setExisting(data.registrations?.[0] || null))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
      if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    };
  }, [preview, screenshotPreview]);

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

  function closePaymentModal() {
    pendingSaveRef.current = null;
    setPendingSave(null);
    clearPaymentModalFields();
  }

  async function finalizeRegistration({ utr = "", screenshot = null }) {
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
    formData.set("agreedToTerms", pending.agreedToTerms ? "true" : "false");
    formData.set("paymentStatus", pending.paymentStatus || "pending");
    formData.set("utrNumber", utr || "");
    formData.set("photo", pending.photoFile);

    if (pending.razorpay?.orderId) {
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
      closePaymentModal();
      return data.registration;
    } catch (err) {
      if (/already have an active/i.test(err.message || "")) {
        try {
          const data = await api("/api/registrations");
          const reg = data.registrations?.[0] || null;
          if (reg) {
            setExisting(reg);
            closePaymentModal();
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
        throw new Error("Please upload a player photo.");
      }

      const values = {
        fullName: form.fullName.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        password: form.password?.value || "",
        company: form.company.value.trim(),
        role: form.role.value.trim(),
        interest: form.interest.value,
      };
      const agreedToTerms = form.agreedToTerms.checked;

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
      let razorpay = null;

      if (paymentConfigured) {
        try {
          const order = await api("/api/registrations/create-order", {
            method: "POST",
            body: JSON.stringify({}),
          });
          const payment = await openRazorpayCheckout(order, values);
          if (payment.ok) {
            razorpay = {
              orderId: payment.razorpay_order_id,
              paymentId: payment.razorpay_payment_id,
              signature: payment.razorpay_signature,
            };
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

      openPaymentDetailsPopup({
        values,
        photoFile,
        agreedToTerms,
        paymentNote,
        paymentStatus,
        razorpay,
        fullName: values.fullName,
      });
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
      await finalizeRegistration({
        utr: utrNumber.trim(),
        screenshot: screenshotFile,
      });
    } catch (err) {
      setModalError(err.message);
    } finally {
      setFinishing(false);
    }
  }

  async function onSkipDetails() {
    if (!pendingSaveRef.current) return;
    setModalError("");
    setUtrNumber("");
    setScreenshotFile(null);
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotPreview("");
    setFinishing(true);
    try {
      // Always skip UTR + screenshot — save player details only
      await finalizeRegistration({ utr: "", screenshot: null });
    } catch (err) {
      setModalError(err.message);
    } finally {
      setFinishing(false);
    }
  }

  if (loading) {
    return <section className="px-4 py-20 text-center text-[color:var(--text-muted)]">Loading...</section>;
  }

  return (
    <section className="bg-ink px-4 py-8 md:py-10">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow text-accent">Player Registration</p>
        <h1 className="page-title mt-1.5">Register. Get Auctioned. Play.</h1>

        {existing ? (
          <div className="panel mt-5 space-y-3 rounded-lg p-5">
            <p className="font-display text-xl text-[color:var(--title)]">Details saved</p>
            <p className="text-sm text-[color:var(--text-muted)]">
              Status: <strong className="uppercase text-accent">{existing.status}</strong>
            </p>
            <div className="flex flex-wrap items-start gap-4">
              {profileImageUrl(existing) ? (
                <img
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
                <p>Role: {playerRoleLabel(existing.role)}</p>
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
              </div>
            </div>
            <Link to="/dashboard" className="btn-primary inline-flex">
              Open Dashboard
            </Link>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            encType="multipart/form-data"
            className="panel mt-8 grid gap-3 rounded-2xl p-6 sm:grid-cols-2"
          >
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
            <label className="block text-sm">
              <span className="text-[color:var(--text-muted)]">Interest</span>
              <select name="interest" className="input-dark mt-1.5" defaultValue="player">
                <option value="player">Player</option>
                <option value="franchise">Franchise</option>
                <option value="sponsor">Sponsor</option>
              </select>
            </label>

            <label className="block text-sm sm:col-span-2">
              <span className="text-[color:var(--text-muted)]">Player photo (JPG/PNG/WEBP)</span>
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
                Registration fee: ₹{feeInr}
              </p>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                Razorpay checkout opens after you click Pay &amp; Submit. Registration is saved only
                after successful payment.
              </p>
              {!paymentConfigured && (
                <p className="mt-2 text-xs text-accent">
                  Razorpay keys are missing on the server. Add them in server `.env`.
                </p>
              )}
            </div>

            <label className="sm:col-span-2 flex items-start gap-2 text-sm text-[color:var(--text-muted)]">
              <input type="checkbox" name="agreedToTerms" required className="mt-1" />
              <span>I confirm eligibility and agree to the terms.</span>
            </label>
            {error && <p className="sm:col-span-2 text-sm text-accent">{error}</p>}
            <button
              type="submit"
              disabled={submitting || Boolean(pendingSave)}
              className="btn-primary sm:col-span-2"
            >
              {submitting ? "Processing payment..." : `Pay ₹${feeInr} & Submit`}
            </button>
          </form>
        )}

        {!user && !existing ? (
          <p className="mt-5 text-sm text-[color:var(--text-muted)]">
            Already registered?{" "}
            <Link to="/signin" className="text-accent-soft">
              Sign in
            </Link>
          </p>
        ) : null}
      </div>

      {pendingSave ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-details-title"
            className="panel w-full max-w-md rounded-2xl p-5"
          >
            <p className="eyebrow text-accent">
              {pendingSave.paymentNote ? "Payment incomplete" : "Payment received"}
            </p>
            <h2 id="payment-details-title" className="mt-1 font-display text-2xl text-[color:var(--title)]">
              {pendingSave.fullName}
            </h2>
            {pendingSave.paymentNote ? (
              <p className="mt-2 text-sm text-accent">{pendingSave.paymentNote}</p>
            ) : null}
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">
              Your player details will be saved. Use Continue to include UTR/screenshot, or Skip to
              save without them.
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
                {finishing ? "Saving..." : "Continue"}
              </button>
              <button
                type="button"
                disabled={finishing}
                onClick={onSkipDetails}
                className="btn-ghost"
              >
                {finishing ? "Saving..." : "Skip"}
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
