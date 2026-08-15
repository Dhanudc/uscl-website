import { useState } from "react";

/** Thumbnail that opens a larger preview on click. */
export default function ZoomableImage({ src, alt = "", className = "", sizeClass = "max-h-[80vh] max-w-[90vw]" }) {
  const [open, setOpen] = useState(false);
  if (!src) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-lg p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        title="View larger"
      >
        <img src={src} alt={alt} className={className} />
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(false)}
        >
          <img
            src={src}
            alt={alt}
            className={`${sizeClass} rounded-lg object-contain shadow-xl`}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
