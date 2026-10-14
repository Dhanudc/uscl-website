import { useMemo, useState } from "react";
import { api } from "../api";
import {
  buildPlayerDocumentUploadBatches,
  PLAYER_DOCUMENT_UPLOAD_SIZE_HINT,
} from "../utils/playerDocumentUploadBatches";
import {
  PLAYER_DOCUMENT_FIELDS,
  playerUploadFieldRows,
} from "../data/playerDocumentFields";
import { AlertBanner } from "./ui";

export default function PlayerDocumentsModal({
  registration,
  onClose,
  onSaved,
  uploadPath,
  eyebrow = "Accepted player",
  title = "Add documents",
  /** player: missing or admin-requested docs; admin: pick types then upload files */
  mode = "player",
}) {
  const isAdmin = mode === "admin";
  const playerRows = useMemo(() => playerUploadFieldRows(registration), [registration]);

  const [adminPick, setAdminPick] = useState(() =>
    Object.fromEntries(PLAYER_DOCUMENT_FIELDS.map((row) => [row.key, false]))
  );
  const [files, setFiles] = useState({});
  const [textValues, setTextValues] = useState(() => ({
    payment_utr: String(registration?.paymentUtr || "").trim(),
  }));
  const [statementPassword, setStatementPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const rowsToShow = useMemo(() => {
    if (!isAdmin) return playerRows;
    return PLAYER_DOCUMENT_FIELDS.filter((row) => adminPick[row.key]);
  }, [isAdmin, playerRows, adminPick]);

  const hasPendingRequest = (registration?.documentsRequestedFromPlayer || []).length > 0;

  function setFile(key, fileList) {
    setFiles((prev) => ({ ...prev, [key]: fileList }));
  }

  function setText(key, value) {
    setTextValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleAdminPick(key) {
    setAdminPick((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (isAdmin && rowsToShow.length === 0) {
        throw new Error("Select at least one document type to upload.");
      }
      if (!isAdmin && playerRows.length === 0) {
        throw new Error("No documents are required right now.");
      }

      for (const row of rowsToShow) {
        if (row.inputType === "text") {
          const val = String(textValues[row.key] || "").trim();
          if (!val) {
            throw new Error(`Please enter ${row.label}.`);
          }
          continue;
        }
        const picked = files[row.key];
        if (!picked || !picked.length) {
          throw new Error(`Please choose a file for ${row.label}.`);
        }
      }

      const batches = buildPlayerDocumentUploadBatches({
        rowsToShow,
        files,
        textValues,
        statementPassword,
      });
      if (!batches.length) {
        throw new Error("Nothing to save.");
      }

      const path = uploadPath || `/api/registrations/${registration._id}/documents`;
      let latestRegistration = registration;
      for (const body of batches) {
        const data = await api(path, {
          method: "POST",
          body,
        });
        latestRegistration = data.registration;
      }
      onSaved?.(latestRegistration);
      onClose?.();
    } catch (err) {
      setError(err.message || "Unable to upload documents.");
    } finally {
      setSaving(false);
    }
  }

  const nothingToUpload = !isAdmin && playerRows.length === 0;

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-documents-title"
        className="panel no-scrollbar max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl p-4 sm:max-h-[90vh] sm:rounded-2xl sm:p-5"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="eyebrow text-accent">{eyebrow}</p>
        <h2 id="player-documents-title" className="mt-1 font-display text-xl text-[color:var(--title)] sm:text-2xl">
          {title}
        </h2>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          {isAdmin
            ? "Select document types, attach files or enter UTR, then save. Bank statement is optional; password only if you upload a statement PDF."
            : hasPendingRequest
              ? "Your admin asked you to re-upload only the documents listed below."
              : "Upload the required documents still missing from your profile. Bank statement and payment attachment are optional unless admin requested them. Payment UTR is a text reference, not a file."}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-[color:var(--text-muted)]">
          {PLAYER_DOCUMENT_UPLOAD_SIZE_HINT}
        </p>

        {error ? (
          <div className="mt-4">
            <AlertBanner tone="error">{error}</AlertBanner>
          </div>
        ) : null}

        {isAdmin ? (
          <div className="mt-4 rounded-lg border border-[color:var(--border)] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
              Select types to upload
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {PLAYER_DOCUMENT_FIELDS.map((row) => (
                <label
                  key={row.key}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-[color:var(--border)] px-2 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--accent)]"
                    checked={Boolean(adminPick[row.key])}
                    onChange={() => toggleAdminPick(row.key)}
                  />
                  <span className="text-[color:var(--title)]">
                    {row.label}
                    {row.optional ? " (optional)" : ""}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {!nothingToUpload ? (
          <div className="mt-4 space-y-4">
            {rowsToShow.map((row) => (
              <div key={row.key} className="rounded-lg border border-[color:var(--border)] p-3">
                {row.inputType === "text" ? (
                  <label className="block text-sm">
                    <span className="font-medium text-[color:var(--title)]">
                      {row.label}
                      {row.optional ? <span className="text-[color:var(--text-muted)]"> (optional)</span> : null}
                    </span>
                    <input
                      type="text"
                      value={textValues[row.key] || ""}
                      onChange={(e) => setText(row.key, e.target.value)}
                      className="input-dark mt-1.5 w-full"
                      placeholder="Transaction / UTR reference number"
                      autoComplete="off"
                      inputMode="text"
                    />
                  </label>
                ) : (
                  <label className="block text-sm">
                    <span className="font-medium text-[color:var(--title)]">
                      {row.label}
                      {row.optional ? <span className="text-[color:var(--text-muted)]"> (optional)</span> : null}
                    </span>
                    <input
                      type="file"
                      multiple={row.multiple}
                      accept="image/*,application/pdf"
                      className="mt-1.5 block w-full text-sm text-[color:var(--text-muted)] file:mr-2 file:rounded-md file:border-0 file:bg-accent file:px-2 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                      onChange={(e) => setFile(row.key, e.target.files)}
                    />
                  </label>
                )}
                {row.key === "bank_statement" ? (
                  <label className="mt-3 block text-sm">
                    <span className="text-[color:var(--text-muted)]">Statement PDF password (optional)</span>
                    <input
                      type="text"
                      value={statementPassword}
                      onChange={(e) => setStatementPassword(e.target.value)}
                      className="input-dark mt-1.5 w-full"
                      placeholder="Only if your PDF is password-protected"
                      autoComplete="off"
                    />
                  </label>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[color:var(--text-muted)]">Nothing to upload at this time.</p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
          <button type="button" className="btn-ghost w-full sm:w-auto" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          {!nothingToUpload && rowsToShow.length > 0 ? (
            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={saving}>
              {saving ? "Saving…" : "Save documents"}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
