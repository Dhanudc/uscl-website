import { useEffect, useMemo, useRef, useState } from "react";

function coverScale(image, width, height) {
  return Math.max(width / image.naturalWidth, height / image.naturalHeight);
}

export default function ImageCropper({ file, aspect = 1, onCancel, onConfirm }) {
  const [image, setImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef(null);
  const viewWidth = 320;
  const viewHeight = Math.round(viewWidth / aspect);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const next = new Image();
    next.onload = () => setImage(next);
    next.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const scale = image ? coverScale(image, viewWidth, viewHeight) * zoom : 1;

  function clamp(next) {
    if (!image) return next;
    const drawnW = image.naturalWidth * scale;
    const drawnH = image.naturalHeight * scale;
    const maxX = Math.max(0, (drawnW - viewWidth) / 2);
    const maxY = Math.max(0, (drawnH - viewHeight) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  const shown = useMemo(() => clamp(offset), [offset, image, scale, viewHeight]);

  function apply() {
    if (!image) return;
    const outW = 1200;
    const outH = Math.round(outW / aspect);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    const ratio = outW / viewWidth;
    const drawW = image.naturalWidth * scale * ratio;
    const drawH = image.naturalHeight * scale * ratio;
    const dx = (viewWidth / 2 + shown.x) * ratio - drawW / 2;
    const dy = (viewHeight / 2 + shown.y) * ratio - drawH / 2;
    ctx.drawImage(image, dx, dy, drawW, drawH);
    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob);
      },
      "image/jpeg",
      0.92
    );
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-title"
        className="panel w-full max-w-md rounded-2xl p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="crop-title" className="font-display text-2xl text-[color:var(--title)]">
          Crop photo
        </h2>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">Drag the photo and use the slider, then apply.</p>
        <div
          className="relative mx-auto mt-4 overflow-hidden rounded-xl bg-black"
          style={{ width: viewWidth, maxWidth: "100%", height: viewHeight }}
          onPointerDown={(event) => {
            drag.current = { x: event.clientX, y: event.clientY, ox: shown.x, oy: shown.y };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            setOffset(
              clamp({
                x: drag.current.ox + (event.clientX - drag.current.x),
                y: drag.current.oy + (event.clientY - drag.current.y),
              })
            );
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
        >
          {image ? (
            <img
              src={image.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
              style={{
                width: image.naturalWidth * scale,
                height: image.naturalHeight * scale,
                transform: `translate(calc(-50% + ${shown.x}px), calc(-50% + ${shown.y}px))`,
              }}
            />
          ) : null}
        </div>
        <label className="mt-4 block text-sm text-[color:var(--text)]">
          Zoom
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            className="mt-2 w-full"
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </label>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className="btn-primary" disabled={!image} onClick={apply}>
            Use crop
          </button>
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function CropUploadButton({ label = "Upload image", aspect = 1, disabled = false, onFile }) {
  const [file, setFile] = useState(null);

  return (
    <>
      <label className={`btn-ghost cursor-pointer !py-2 !text-xs ${disabled ? "pointer-events-none opacity-60" : ""}`}>
        {label}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.files?.[0];
            event.target.value = "";
            if (next) setFile(next);
          }}
        />
      </label>
      {file ? (
        <ImageCropper
          file={file}
          aspect={aspect}
          onCancel={() => setFile(null)}
          onConfirm={(blob) => {
            const cropped = new File([blob], "photo.jpg", { type: "image/jpeg" });
            setFile(null);
            onFile(cropped);
          }}
        />
      ) : null}
    </>
  );
}
