import { useState } from "react";

/** Thumbnail that opens a larger preview on click. */
export default function ZoomableImage({
  src,
  alt = "",
  className = "",
  buttonClassName = "",
  sizeClass = "max-h-[92vh] max-w-[94vw]",
  onError,
}) {
  const [open, setOpen] = useState(false);
  if (!src) return null;

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        className={`inline-flex cursor-zoom-in items-center justify-center p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${buttonClassName}`}
        title="View larger"
      >
        <img src={src} alt={alt} className={className} onError={onError} />
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
