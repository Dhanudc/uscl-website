export default function PaymentQrModal({
  open,
  playerCode,
  amountInr,
  utrNumber,
  onUtrChange,
  screenshotFile,
  screenshotPreview,
  existingScreenshotUrl,
  onScreenshotChange,
  error,
  submitting,
  submitLabel = "Register",
  onSubmit,
  onClose,
}) {
  if (!open) return null;

  const amountLabel =
    amountInr != null && Number.isFinite(Number(amountInr))
      ? `₹${Number(amountInr).toLocaleString("en-IN")}`
      : null;

  return (
    <div
      className="fixed inset-0 z-[92] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-qr-title"
        className="panel relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl p-5 sm:max-w-3xl sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-accent">UPI payment</p>
            <h2
              id="payment-qr-title"
              className="mt-1 font-display text-2xl text-[color:var(--title)]"
            >
              Complete payment
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              {playerCode ? `Player ID ${playerCode}` : "Registration saved"}
              {amountLabel ? ` · Pay ${amountLabel}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="ui-modal-close"
            aria-label="Close payment"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="mt-5 grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_240px]">
          <div className="order-2 space-y-4 md:order-1">
            <label className="block text-sm">
              <span className="text-[color:var(--text-muted)]">
                UTR number <span className="text-accent">*</span>
              </span>
              <input
                type="text"
                value={utrNumber}
                onChange={(e) => onUtrChange(e.target.value)}
                className="input-dark mt-1.5"
                placeholder="Enter UTR / UPI reference"
                autoComplete="off"
                required
              />
            </label>

            <div className="text-sm">
              <p className="text-[color:var(--text-muted)]">
                Payment screenshot <span className="text-accent">*</span>
              </p>
              <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[color:var(--border-strong)] bg-ink-soft px-4 py-6 text-center transition hover:border-accent">
                <input
                  type="file"
                  accept="image/*"
                  required
                  className="sr-only"
                  onChange={(e) => onScreenshotChange(e.target.files?.[0] || null)}
                />
                {screenshotPreview || existingScreenshotUrl ? (
                  <img
                    src={screenshotPreview || existingScreenshotUrl}
                    alt="Payment screenshot preview"
                    className="h-28 w-auto max-w-full rounded-lg object-contain"
                  />
                ) : (
                  <>
                    <span className="text-sm font-semibold text-[color:var(--title)]">
                      Choose file
                    </span>
                    <span className="mt-1 text-xs text-[color:var(--text-muted)]">
                      JPG, PNG, or WEBP of your UPI payment
                    </span>
                  </>
                )}
              </label>
              {screenshotFile ? (
                <p className="mt-1.5 text-xs text-[color:var(--text-muted)]">{screenshotFile.name}</p>
              ) : null}
            </div>

            {error ? <p className="text-sm text-accent">{error}</p> : null}

            <button
              type="button"
              disabled={submitting}
              className="btn-primary w-full"
              onClick={onSubmit}
            >
              {submitting ? "Saving..." : submitLabel}
            </button>
          </div>

          <div className="order-1 rounded-2xl bg-white p-3 text-center md:order-2">
            <p className="text-[11px] font-bold tracking-wide text-zinc-800">
              WESLEY ELITE SPORTS LLP
            </p>
            {amountLabel ? (
              <p className="mt-0.5 text-[11px] font-semibold text-zinc-500">{amountLabel}</p>
            ) : null}
            <img
              src="/brand/payment-qr.png"
              alt="UPI QR code for Wesley Elite Sports LLP"
              className="mx-auto mt-2 w-full max-w-[200px]"
            />
            <p className="mt-2 text-[11px] text-zinc-500">Scan with any UPI app</p>
          </div>
        </div>
      </div>
    </div>
  );
}
