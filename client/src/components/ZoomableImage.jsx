import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Thumbnail that opens a larger preview on click. */
export default function ZoomableImage({
  src,
  alt = "",
  className = "",
  buttonClassName = "",
  buttonStyle,
  imgStyle,
  sizeClass = "max-h-[92vh] max-w-[94vw]",
  /** Top-weighted crop in thumbnails; default on unless className uses object-contain */
  portraitCrop,
  onError,
}) {
  const [open, setOpen] = useState(false);
  const useTopCrop =
    portraitCrop !== undefined ? portraitCrop : !/\bobject-contain\b/.test(className);

  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!src) return null;

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        style={buttonStyle}
        className={`inline-flex cursor-zoom-in items-center justify-center p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${buttonClassName}`}
        title="View larger"
      >
        <img
          src={src}
          alt={alt}
          className={[className, useTopCrop && "avatar-portrait"].filter(Boolean).join(" ")}
          style={imgStyle}
          onError={onError}
        />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Enlarged photo"
              onClick={() => setOpen(false)}
            >
              <button
                type="button"
                className="absolute right-4 top-4 z-10 rounded-full border border-white/25 bg-black/50 px-3 py-1.5 text-sm font-semibold text-white hover:bg-black/70"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
              <img
                src={src}
                alt={alt}
                className={`${sizeClass} rounded-lg object-contain shadow-xl`}
                onClick={(e) => e.stopPropagation()}
              />
            </div>,
            document.body
          )
        : null}
    </>
  );
}
