import { useMemo, useState } from "react";
import { apiDownload } from "../../api";
import { docKeyBaseFamily, documentDisplayLabel } from "../../utils/playerDocumentLabels";

const API_BASE = String(import.meta.env.VITE_API_URL || "")
  .trim()
  .replace(/\/$/, "");

function sortDocs(docs) {
  return [...(docs || [])].sort((a, b) => {
    const baseCmp = docKeyBaseFamily(a.docKey).localeCompare(docKeyBaseFamily(b.docKey));
    if (baseCmp !== 0) return baseCmp;
    const ta = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
    const tb = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
    if (ta !== tb) return ta - tb;
    return String(a.docKey).localeCompare(String(b.docKey));
  });
}

function DocRow({ row, busy, onView, onDownload }) {
  return (
    <li
      className="flex flex-col gap-2 rounded-lg border border-[color:var(--border)] px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 flex-1">
        <span className="font-medium text-[color:var(--title)]">{documentDisplayLabel(row)}</span>
        {row.filePassword ? (
          <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
            PDF password: <span className="font-mono text-[color:var(--title)]">{row.filePassword}</span>
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="text-xs font-semibold text-accent underline underline-offset-2 hover:text-accent-soft disabled:opacity-50"
          disabled={busy === `view:${row.filename}`}
          onClick={() => onView(row.filename, row.mimeType)}
        >
          {busy === `view:${row.filename}` ? "Opening…" : "View"}
        </button>
        <button
          type="button"
          className="text-xs font-semibold text-[color:var(--text-muted)] underline underline-offset-2 hover:text-[color:var(--title)] disabled:opacity-50"
          disabled={busy === `dl:${row.filename}`}
          onClick={() => onDownload(row.filename, row.originalName)}
        >
          {busy === `dl:${row.filename}` ? "Downloading…" : "Download"}
        </button>
      </div>
    </li>
  );
}

function DocSection({ title, docs, busy, onView, onDownload }) {
  if (!docs.length) return null;
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">{title}</p>
      <ul className="space-y-2">
        {docs.map((row) => (
          <DocRow
            key={`${row.docKey}-${row.filename}`}
            row={row}
            busy={busy}
            onView={onView}
            onDownload={onDownload}
          />
        ))}
      </ul>
    </div>
  );
}

export default function AdminPlayerDocumentsList({ registration, compact = false, grouped = false }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const docs = useMemo(() => sortDocs(registration?.playerDocuments || []), [registration?.playerDocuments]);
  const regId = registration?._id;
  const paymentUtrText = String(registration?.paymentUtr || "").trim();

  const identity = docs.filter((d) => ["pan", "aadhar_front", "aadhar_back"].includes(docKeyBaseFamily(d.docKey)));
  const payslips = docs.filter((d) => docKeyBaseFamily(d.docKey).startsWith("payslip_"));
  const banks = docs.filter((d) => docKeyBaseFamily(d.docKey) === "bank_statement");
  const paymentAttachments = docs.filter((d) => docKeyBaseFamily(d.docKey) === "payment_attachment");
  const legacyUtrFiles = docs.filter((d) => docKeyBaseFamily(d.docKey) === "payment_utr");

  async function fetchBlob(filename) {
    const headers = { "X-USCL-Portal": "admin" };
    const res = await fetch(
      `${API_BASE}/api/admin/registrations/${regId}/documents/${encodeURIComponent(filename)}`,
      { credentials: "include", headers }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Unable to load document.");
    }
    return res.blob();
  }

  async function viewDocument(filename) {
    if (!regId || !filename) return;
    setBusy(`view:${filename}`);
    setError("");
    try {
      const blob = await fetchBlob(filename);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(err.message || "Unable to open document.");
    } finally {
      setBusy("");
    }
  }

  async function downloadDocument(filename, originalName) {
    if (!regId || !filename) return;
    setBusy(`dl:${filename}`);
    setError("");
    try {
      await apiDownload(
        `/api/admin/registrations/${regId}/documents/${encodeURIComponent(filename)}`,
        { filename: originalName || filename }
      );
    } catch (err) {
      setError(err.message || "Download failed.");
    } finally {
      setBusy("");
    }
  }

  if (!docs.length && !paymentUtrText) {
    return (
      <p className={compact ? "text-xs text-[color:var(--text-muted)]" : "text-sm text-[color:var(--text-muted)]"}>
        No documents uploaded yet.
      </p>
    );
  }

  const listClass = compact ? "space-y-1.5" : "space-y-2";

  if (!grouped) {
    return (
      <div>
        {error ? <p className="mb-2 text-xs text-accent">{error}</p> : null}
        {paymentUtrText ? (
          <p className="mb-2 text-sm text-[color:var(--text-muted)]">
            Payment UTR: <span className="font-mono text-[color:var(--title)]">{paymentUtrText}</span>
          </p>
        ) : null}
        <ul className={listClass}>
          {docs.map((row) => (
            <DocRow
              key={`${row.docKey}-${row.filename}`}
              row={row}
              busy={busy}
              onView={viewDocument}
              onDownload={downloadDocument}
            />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-xs text-accent">{error}</p> : null}
      <DocSection
        title="PAN & Aadhaar"
        docs={identity}
        busy={busy}
        onView={viewDocument}
        onDownload={downloadDocument}
      />
      <DocSection
        title="Payslips"
        docs={payslips}
        busy={busy}
        onView={viewDocument}
        onDownload={downloadDocument}
      />
      <DocSection
        title="Bank statements (optional)"
        docs={banks}
        busy={busy}
        onView={viewDocument}
        onDownload={downloadDocument}
      />
      {paymentUtrText ? (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
            Payment UTR (optional)
          </p>
          <p className="rounded-lg border border-[color:var(--border)] px-3 py-2 font-mono text-sm text-[color:var(--title)]">
            {paymentUtrText}
          </p>
        </div>
      ) : null}
      <DocSection
        title="Payment attachment (optional)"
        docs={[...legacyUtrFiles, ...paymentAttachments]}
        busy={busy}
        onView={viewDocument}
        onDownload={downloadDocument}
      />
    </div>
  );
}
