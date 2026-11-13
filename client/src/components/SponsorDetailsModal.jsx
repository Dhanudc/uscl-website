import { useEffect } from "react";
import {
  TITLE_SPONSOR_LINE,
  TITLE_SPONSOR_NAME,
  TITLE_SPONSOR_ORGANISER_LINE,
  USCL_PRIMARY_LOGO,
} from "../data/brandAssets";
import ZoomableImage from "./ZoomableImage";

export default function SponsorDetailsModal({ onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sponsor-details-title"
        className="modal-sheet panel overflow-hidden sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-accent" />
        <div className="px-4 py-5 sm:px-6 sm:py-6">
          <p className="eyebrow text-accent">Title sponsor</p>
          <div className="mt-4 flex flex-col items-center text-center">
            <ZoomableImage
              src={USCL_PRIMARY_LOGO}
              alt={TITLE_SPONSOR_NAME}
              portraitCrop={false}
              buttonClassName="inline-flex h-40 w-32 items-center justify-center rounded-xl bg-white p-2 shadow-md ring-2 ring-[color:var(--border)]"
              className="h-full w-full object-contain object-center"
              sizeClass="max-h-[min(92vh,720px)] max-w-[min(94vw,420px)]"
            />
            <h2 id="sponsor-details-title" className="font-display mt-4 text-2xl text-[color:var(--title)]">
              {TITLE_SPONSOR_NAME}
            </h2>
            <p className="mt-2 text-sm font-semibold text-accent">{TITLE_SPONSOR_LINE}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
              {TITLE_SPONSOR_ORGANISER_LINE}
            </p>
            <p className="mt-4 max-w-sm text-sm text-[color:var(--text-muted)]">
              Tap the logo above to view it larger. Somireddy Group is the title sponsor of USCL T20 Season 2026.
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost mt-6 w-full justify-center">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
