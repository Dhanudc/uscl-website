import { useEffect, useState } from "react";
import { api } from "../../api";
import {
  fieldLabelByKey,
  PLAYER_DOCUMENT_FIELDS,
  registrationHasDocKey,
} from "../../data/playerDocumentFields";
import AdminPlayerDocumentsList from "./AdminPlayerDocumentsList.jsx";
import { AlertBanner } from "../ui";

export default function AdminPlayerDocumentsPanel({ registration, busyId, onUpdated, onAdminUpload }) {
  const [requestPick, setRequestPick] = useState({});
  const [savingRequest, setSavingRequest] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  useEffect(() => {
    const initial = Object.fromEntries(
      PLAYER_DOCUMENT_FIELDS.map((row) => [
        row.key,
        (registration?.documentsRequestedFromPlayer || []).includes(row.key),
      ])
    );
    setRequestPick(initial);
  }, [registration?._id, registration?.documentsRequestedFromPlayer]);

  async function saveDocumentRequests() {
    if (!registration?._id) return;
    const keys = PLAYER_DOCUMENT_FIELDS.filter((row) => requestPick[row.key]).map((row) => row.key);
    setSavingRequest(true);
    setRequestError("");
    setRequestMessage("");
    try {
      const regId = String(registration._id || "").trim();
      if (!regId) {
        throw new Error("Registration id is missing. Go back to the list and open the player again.");
      }
      const data = await api(`/api/admin/registrations/${regId}/document-requests`, {
        method: "PATCH",
        body: JSON.stringify({ documentsRequestedFromPlayer: keys }),
      });
      onUpdated?.(data.registration);
      setRequestMessage(
        keys.length
          ? `Player must re-upload: ${keys.map(fieldLabelByKey).join(", ")}`
          : "Re-upload requests cleared."
      );
    } catch (err) {
      setRequestError(err.message || "Unable to save requests.");
    } finally {
      setSavingRequest(false);
    }
  }

  async function setDocumentsVerification(status) {
    if (!registration?._id) return;
    setVerifyBusy(true);
    setVerifyError("");
    try {
      const regId = String(registration._id).trim();
      const data = await api(`/api/admin/registrations/${regId}/documents-verification`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      onUpdated?.(data.registration);
      setRequestMessage(
        status === "verified"
          ? "Documents marked as verified for this player."
          : status === "rejected"
            ? "Documents marked as rejected."
            : "Document review set to in progress (shows under Registrations → In progress filter)."
      );
    } catch (err) {
      setVerifyError(err.message || "Unable to update verification.");
    } finally {
      setVerifyBusy(false);
    }
  }

  const pending = registration?.documentsRequestedFromPlayer || [];
  const docVerStatus = String(registration?.documentsVerificationStatus || "none").toLowerCase();
  const hasFiles =
    (registration?.playerDocuments || []).length > 0 || Boolean(String(registration?.paymentUtr || "").trim());
  const canReviewDocs = hasFiles;

  return (
    <div className="mt-3 space-y-4 border-t border-[color:var(--border)] pt-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost !py-1.5 !text-xs" onClick={() => onAdminUpload?.(registration)}>
          Upload as admin
        </button>
        {registration?.documentsComplete ? (
          <span className="text-xs font-semibold text-emerald-300">Required docs complete</span>
        ) : (
          <span className="text-xs text-amber-300">Required docs incomplete</span>
        )}
        {pending.length ? (
          <span className="text-xs text-accent-soft">Waiting on player re-upload ({pending.length})</span>
        ) : null}
      </div>

      {hasFiles ? (
        <section className="rounded-lg border border-[color:var(--border)] bg-ink-soft/30 p-3 sm:p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-[color:var(--title)]">
            1. Documents on file
          </h3>
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">
            Current uploads from player or admin. Bank statement, payment UTR (text), and payment attachment are optional unless requested below.
          </p>
          <div className="mt-3">
            <AdminPlayerDocumentsList registration={registration} grouped />
          </div>
        </section>
      ) : (
        <p className="text-xs text-[color:var(--text-muted)]">No documents on file yet.</p>
      )}

      <section className="rounded-lg border border-[color:var(--border)] bg-ink-soft/30 p-3 sm:p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[color:var(--title)]">
          2. Document verification
        </h3>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
          Review the files above, then set status below. Use <strong className="text-[color:var(--title)]">In progress</strong>{" "}
          while waiting to decide (or to re-open after verified/rejected). Registrations list filters match these
          statuses.
        </p>
        {docVerStatus === "verified" ? (
          <p className="mt-2 text-sm font-semibold text-emerald-300">
            Current: Documents verified
            {registration.documentsVerificationBy ? ` · ${registration.documentsVerificationBy}` : ""}
          </p>
        ) : docVerStatus === "rejected" ? (
          <p className="mt-2 text-sm font-semibold text-accent-soft">
            Current: Documents rejected
            {registration.documentsVerificationBy ? ` · ${registration.documentsVerificationBy}` : ""}
          </p>
        ) : docVerStatus === "in_progress" ? (
          <p className="mt-2 text-sm font-semibold text-amber-200">
            Documents uploaded — awaiting your verified / rejected decision.
          </p>
        ) : hasFiles ? (
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
            Files on record. Choose verified or rejected when review is complete.
          </p>
        ) : (
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">No documents uploaded yet.</p>
        )}
        {verifyError ? (
          <div className="mt-3">
            <AlertBanner tone="error">{verifyError}</AlertBanner>
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={`btn-ghost !py-1.5 !text-xs ${
              docVerStatus === "in_progress" ? "!border-amber-400/60 !text-amber-200" : ""
            }`}
            disabled={!canReviewDocs || verifyBusy || busyId === registration?._id}
            onClick={() => setDocumentsVerification("in_progress")}
          >
            {verifyBusy ? "Saving…" : "In progress"}
          </button>
          <button
            type="button"
            className={`btn-ghost !py-1.5 !text-xs ${
              docVerStatus === "verified" ? "!border-emerald-400/60 !text-emerald-300" : ""
            }`}
            disabled={!canReviewDocs || verifyBusy || busyId === registration?._id}
            onClick={() => setDocumentsVerification("verified")}
          >
            Documents verified
          </button>
          <button
            type="button"
            className={`btn-ghost !py-1.5 !text-xs ${
              docVerStatus === "rejected" ? "!border-accent/60 !text-accent-soft" : ""
            }`}
            disabled={!canReviewDocs || verifyBusy || busyId === registration?._id}
            onClick={() => setDocumentsVerification("rejected")}
          >
            Documents rejected
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-accent/25 bg-accent/5 p-3 sm:p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[color:var(--title)]">
          3. Request re-upload from player
        </h3>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
          Select which documents the player must submit again. They will only see those fields on their dashboard.
          Optional types (bank statement, payment UTR, payment attachment) become required for the player only when you select them here.
        </p>
        {registration?.documentsRequestedAt ? (
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
            Last saved
            {registration.documentsRequestedBy ? ` by ${registration.documentsRequestedBy}` : ""}
            {` · ${new Date(registration.documentsRequestedAt).toLocaleString()}`}
          </p>
        ) : null}
        {requestError ? (
          <div className="mt-3">
            <AlertBanner tone="error">{requestError}</AlertBanner>
          </div>
        ) : null}
        {requestMessage ? (
          <div className="mt-3">
            <AlertBanner tone="ok">{requestMessage}</AlertBanner>
          </div>
        ) : null}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {PLAYER_DOCUMENT_FIELDS.map((row) => (
            <label
              key={row.key}
              className="flex cursor-pointer items-start gap-2 rounded-md border border-[color:var(--border)] bg-ink-card px-2 py-2 text-sm"
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
                checked={Boolean(requestPick[row.key])}
                disabled={savingRequest || busyId === registration?._id}
                onChange={() => setRequestPick((prev) => ({ ...prev, [row.key]: !prev[row.key] }))}
              />
              <span className="min-w-0 text-[color:var(--title)]">
                {row.label}
                {row.optional ? <span className="text-[color:var(--text-muted)]"> (optional)</span> : null}
                <span className="mt-0.5 block text-xs text-[color:var(--text-muted)]">
                  {registrationHasDocKey(registration, row.key)
                    ? row.inputType === "text"
                      ? "Provided"
                      : "On file"
                    : row.inputType === "text"
                      ? "Not provided"
                      : "Not uploaded"}
                  {pending.includes(row.key) ? " · Requested" : ""}
                </span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary !py-1.5 !text-xs"
            disabled={savingRequest || busyId === registration?._id}
            onClick={saveDocumentRequests}
          >
            {savingRequest ? "Saving…" : "Save request for player"}
          </button>
          <button
            type="button"
            className="btn-ghost !py-1.5 !text-xs"
            disabled={savingRequest || busyId === registration?._id}
            onClick={() => {
              setRequestPick(Object.fromEntries(PLAYER_DOCUMENT_FIELDS.map((row) => [row.key, false])));
            }}
          >
            Clear selection
          </button>
        </div>
      </section>
    </div>
  );
}
