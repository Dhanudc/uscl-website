import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { api } from "../api";
import { franchises } from "../data/franchises";
import PlayerTeamCard, { CARD_HEIGHT } from "./PlayerTeamCard";

function computePreviewScale() {
  if (typeof window === "undefined") return 0.32;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  // Reserve space for header + action buttons (~280px) and padding
  const maxPreviewHeight = Math.max(220, vh - 280);
  const maxPreviewWidth = Math.min(vw - 32, 420);
  const byHeight = maxPreviewHeight / CARD_HEIGHT;
  const byWidth = maxPreviewWidth / 1080;
  return Math.min(0.4, byHeight, byWidth, 1);
}

export default function PlayerTeamCardModal({ registration, onClose }) {
  const exportRef = useRef(null);
  const [owner, setOwner] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [previewScale, setPreviewScale] = useState(computePreviewScale);

  const franchiseId = String(registration?.franchiseId || "").trim();
  const franchise = franchises.find((f) => f.id === franchiseId) || null;

  useLayoutEffect(() => {
    function onResize() {
      setPreviewScale(computePreviewScale());
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const [squadRole, setSquadRole] = useState(
    () =>
      registration?.squadRole ||
      (String(registration?.interest || "").toLowerCase() === "captain" ? "captain" : "player")
  );

  useEffect(() => {
    if (!franchiseId) return;
    api("/api/teams")
      .then((data) => {
        const team = (data.teams || []).find((t) => t.id === franchiseId);
        setOwner(team?.owner || null);
      })
      .catch(() => setOwner(null));
  }, [franchiseId]);

  useEffect(() => {
    if (registration?.squadRole) {
      setSquadRole(registration.squadRole);
      return;
    }
    api("/api/registrations/team-lineup")
      .then((data) => {
        if (data.permissions?.mySquadRole) {
          setSquadRole(data.permissions.mySquadRole);
        }
      })
      .catch(() => {});
  }, [registration?.squadRole, registration?._id, registration?.id]);

  async function downloadCard() {
    if (!exportRef.current) return;
    setBusy("download");
    setError("");
    try {
      const dataUrl = await toPng(exportRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        includeQueryParams: true,
      });
      const link = document.createElement("a");
      link.download = `USCL-${registration?.playerCode || "player"}-card.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      setError(err.message || "Could not create image. Try adding a profile photo first.");
    } finally {
      setBusy("");
    }
  }

  async function shareCard() {
    if (!exportRef.current) return;
    setBusy("share");
    setError("");
    try {
      const dataUrl = await toPng(exportRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        includeQueryParams: true,
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `USCL-${registration?.playerCode || "player"}.png`, {
        type: "image/png",
      });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${registration?.fullName} · ${franchise?.name || "USCL"}`,
        });
      } else {
        await downloadCard();
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        setError(err.message || "Share not available on this device. Use Download.");
      }
    } finally {
      setBusy("");
    }
  }

  if (!franchise) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/80 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-card-modal-title"
        className="flex max-h-[100dvh] w-full max-w-lg flex-col rounded-t-2xl border border-[color:var(--border)] bg-ink-card shadow-2xl sm:max-h-[92dvh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-4 pt-4 pb-2">
          <p className="eyebrow text-accent">Franchise player card</p>
          <h2 id="team-card-modal-title" className="font-display text-lg text-[color:var(--title)] sm:text-xl">
            Share your team card
          </h2>
          <p className="mt-1 text-xs text-[color:var(--text-muted)] sm:text-sm">
            Download or share your official USCL franchise card. Scroll the preview if needed.
          </p>
        </div>

        <PlayerTeamCard
          variant="export"
          registration={{ ...registration, squadRole }}
          franchise={franchise}
          owner={owner}
          exportRef={exportRef}
        />

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2">
          <div className="flex justify-center">
            <PlayerTeamCard
              variant="preview"
              registration={{ ...registration, squadRole }}
              franchise={franchise}
              owner={owner}
              previewScale={previewScale}
            />
          </div>
          {error ? <p className="mt-3 text-center text-sm text-accent">{error}</p> : null}
        </div>

        <div className="shrink-0 border-t border-[color:var(--border)] bg-ink-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="btn-primary flex-1 !py-2.5 !text-sm"
              disabled={Boolean(busy)}
              onClick={downloadCard}
            >
              {busy === "download" ? "Creating…" : "Download image"}
            </button>
            <button
              type="button"
              className="btn-ghost flex-1 !py-2.5 !text-sm"
              disabled={Boolean(busy)}
              onClick={shareCard}
            >
              {busy === "share" ? "Preparing…" : "Share"}
            </button>
          </div>
          <button
            type="button"
            className="btn-ghost mt-2 w-full !py-2 !text-sm"
            onClick={onClose}
            disabled={Boolean(busy)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
