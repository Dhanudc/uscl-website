"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { USCL_PRIMARY_LOGO } from "@/data/brandAssets";

export function UsclLogoFooterZoom({
  alt = "USCL — Somireddy Group title sponsor",
}: {
  alt?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        title="View larger"
        onClick={() => setOpen(true)}
        className="inline-flex h-[7.25rem] w-[5.75rem] cursor-zoom-in items-center justify-center rounded-lg bg-white p-1 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <img
          src={USCL_PRIMARY_LOGO}
          alt={alt}
          className="h-full w-full object-contain object-center"
          width={92}
          height={116}
        />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Enlarged logo"
              onClick={(e) => {
                if (e.target === e.currentTarget) setOpen(false);
              }}
            >
              <button
                type="button"
                className="absolute right-4 top-4 rounded-full border border-white/25 bg-black/50 px-3 py-1.5 text-sm font-semibold text-white hover:bg-black/70"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
              <img
                src={USCL_PRIMARY_LOGO}
                alt={alt}
                className="max-h-[min(92vh,720px)] max-w-[min(94vw,420px)] rounded-lg object-contain shadow-xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>,
            document.body
          )
        : null}
    </>
  );
}
