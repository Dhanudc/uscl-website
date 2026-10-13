import { useEffect } from "react";
import AdminPlayerDocumentsList from "./AdminPlayerDocumentsList.jsx";

export default function AdminPlayerDocumentsViewModal({ registration, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!registration) return null;

  return (
    <div
      className="fixed inset-0 z-[88] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-docs-view-title"
        className="panel no-scrollbar max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-accent">Player documents</p>
            <h2 id="admin-docs-view-title" className="mt-1 font-display text-2xl text-[color:var(--title)]">
              {registration.fullName}
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Player ID {registration.playerCode || "—"}
              {registration.documentsSubmittedAt
                ? ` · Submitted ${new Date(registration.documentsSubmittedAt).toLocaleString()}`
                : ""}
            </p>
          </div>
          <button type="button" className="ui-modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="mt-5">
          <AdminPlayerDocumentsList registration={registration} />
        </div>

        <div className="mt-5">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
