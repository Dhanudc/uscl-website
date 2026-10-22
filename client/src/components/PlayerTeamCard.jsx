import { squadRoleLabel } from "./SquadRoleBadge";
import { playerRoleLabel } from "../data/playerRoles";
import { profileImageUrl } from "../utils/media";

const USCL_WORDMARK = "/brand/uscl-wordmark.png";
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
/** Matches decorative frame `inset`. */
const CARD_FRAME_INSET = 24;
/** Breathing room inside the frame for corner logos (both sides). */
const CARD_LOGO_GAP = 14;
const CARD_LOGO_INSET = CARD_FRAME_INSET + CARD_LOGO_GAP;

function CardCornerLogoPlate({ src, alt, side, height, maxWidth }) {
  const isLeft = side === "left";
  return (
    <div
      style={{
        position: "absolute",
        top: CARD_LOGO_INSET,
        ...(isLeft ? { left: CARD_LOGO_INSET } : { right: CARD_LOGO_INSET }),
        zIndex: 2,
        padding: "10px 12px",
        borderRadius: 10,
        background: "#ffffff",
        boxShadow: "0 6px 22px rgba(0,0,0,0.45)",
        lineHeight: 0,
      }}
    >
      <img
        src={src}
        alt={alt}
        crossOrigin="anonymous"
        style={{
          display: "block",
          height,
          width: "auto",
          maxWidth,
          objectFit: "contain",
        }}
      />
    </div>
  );
}

function absoluteUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
  }
  return path;
}

function CardSquadRoleBadge({ role, accent }) {
  const normalized = String(role || "player").toLowerCase();
  if (normalized !== "captain" && normalized !== "vice_captain") return null;
  const isCaptain = normalized === "captain";
  return (
    <div
      style={{
        display: "inline-block",
        marginTop: 20,
        padding: "12px 32px",
        borderRadius: 999,
        fontSize: 26,
        fontWeight: 800,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        background: isCaptain ? accent : `${accent}40`,
        color: isCaptain ? "#fff" : "#fff",
        border: `2px solid ${accent}`,
        boxShadow: isCaptain ? `0 8px 28px ${accent}77` : `0 4px 16px rgba(0,0,0,0.35)`,
      }}
    >
      {squadRoleLabel(normalized)}
    </div>
  );
}

function CardArt({ registration, franchise, owner, accent, photo, ownerPhoto, squadRole }) {
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: CARD_FRAME_INSET,
          border: `3px solid ${accent}`,
          boxShadow: `0 0 40px ${accent}88, inset 0 0 30px ${accent}33`,
          clipPath:
            "polygon(8% 0%, 92% 0%, 100% 8%, 100% 92%, 92% 100%, 8% 100%, 0% 92%, 0% 8%)",
          pointerEvents: "none",
        }}
      />

      <CardCornerLogoPlate
        src={absoluteUrl(USCL_WORDMARK)}
        alt="USCL"
        side="left"
        height={148}
        maxWidth={420}
      />
      <CardCornerLogoPlate
        src={absoluteUrl(franchise?.image)}
        alt=""
        side="right"
        height={200}
        maxWidth={440}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: 280,
        }}
        aria-hidden="true"
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          textAlign: "center",
          padding: "8px 48px 0",
        }}
      >
        {photo ? (
          <img
            src={absoluteUrl(photo)}
            alt={registration?.fullName || "Player"}
            crossOrigin="anonymous"
            style={{
              display: "block",
              margin: "0 auto",
              width: 480,
              height: 480,
              objectFit: "cover",
              objectPosition: "center center",
              clipPath:
                "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
              boxShadow: `0 0 48px ${accent}99`,
              background: `linear-gradient(180deg, ${accent}55, #0a0a12)`,
            }}
          />
        ) : (
          <div
            style={{
              margin: "0 auto",
              width: 480,
              height: 480,
              clipPath:
                "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
              background: `linear-gradient(180deg, ${accent}55, #0a0a12)`,
              boxShadow: `0 0 48px ${accent}99`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 120,
              fontWeight: 800,
              color: accent,
            }}
          >
            {(registration?.fullName || "?").slice(0, 1)}
          </div>
        )}

        <h1
          style={{
            marginTop: 36,
            fontSize: 52,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
            textShadow: "0 4px 24px rgba(0,0,0,0.6)",
            lineHeight: 1.1,
          }}
        >
          {registration?.fullName || "Player"}
        </h1>
        <p style={{ marginTop: 12, fontSize: 26, opacity: 0.9, lineHeight: 1.35 }}>
          {registration?.playerCode ? `Player ID · ${registration.playerCode}` : ""}
          {registration?.role ? ` · ${playerRoleLabel(registration.role)}` : ""}
        </p>

        <CardSquadRoleBadge role={squadRole} accent={accent} />

        {Number(registration?.soldPrice) > 0 ? (
          <div
            style={{
              display: "inline-block",
              marginTop: 24,
              padding: "14px 36px",
              borderRadius: 999,
              background: `linear-gradient(90deg, ${accent}, ${accent}99)`,
              fontSize: 32,
              fontWeight: 800,
              boxShadow: `0 8px 32px ${accent}66`,
            }}
          >
            SOLD · ₹{Number(registration.soldPrice).toLocaleString("en-IN")}
          </div>
        ) : null}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 2,
          padding: "44px 56px 56px",
          background: "linear-gradient(0deg, rgba(0,0,0,0.9), transparent)",
        }}
      >
        <p style={{ fontSize: 52, fontWeight: 700, color: accent, lineHeight: 1.15 }}>
          {franchise?.name}
        </p>
        {owner?.fullName ? (
          <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 20 }}>
            {ownerPhoto ? (
              <img
                src={ownerPhoto}
                alt=""
                crossOrigin="anonymous"
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `2px solid ${accent}`,
                  flexShrink: 0,
                }}
              />
            ) : null}
            <p style={{ fontSize: 38, opacity: 0.9, lineHeight: 1.35 }}>
              Franchise owner · <strong>{owner.fullName}</strong>
            </p>
          </div>
        ) : null}
        <p style={{ marginTop: 16, fontSize: 32, opacity: 0.68 }}>USCL T20 · Season 2026</p>
      </div>
    </>
  );
}

function cardRootStyle(accent) {
  return {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    fontFamily: "system-ui, sans-serif",
    position: "relative",
    background: `linear-gradient(160deg, #050508 0%, ${accent}40 38%, #0c0c14 72%, #050508 100%)`,
    color: "#fff",
    overflow: "hidden",
    boxSizing: "border-box",
  };
}

/**
 * @param {{ registration, franchise, owner, exportRef?, previewScale?: number, variant?: 'preview' | 'export' }} props
 */
export default function PlayerTeamCard({
  registration,
  franchise,
  owner,
  exportRef,
  previewScale = 0.42,
  variant = "preview",
}) {
  const accent = franchise?.accent || "#c9a227";
  const photo = profileImageUrl(registration);
  const ownerPhoto = owner?.profileImageUrl ? absoluteUrl(owner.profileImageUrl) : "";
  const squadRole =
    registration?.squadRole ||
    (String(registration?.interest || "").toLowerCase() === "captain" ? "captain" : "player");

  const artProps = { registration, franchise, owner, accent, photo, ownerPhoto, squadRole };

  if (variant === "export") {
    return (
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: -10000,
          top: 0,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          overflow: "hidden",
          pointerEvents: "none",
          opacity: 1,
        }}
      >
        <div
          ref={exportRef}
          style={{
            ...cardRootStyle(accent),
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
          }}
        >
          <CardArt {...artProps} />
        </div>
      </div>
    );
  }

  const scale = previewScale;
  return (
    <div
      style={{
        width: CARD_WIDTH * scale,
        height: CARD_HEIGHT * scale,
        overflow: "hidden",
      }}
      className="mx-auto"
    >
      <div
        style={{
          ...cardRootStyle(accent),
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <CardArt {...artProps} />
      </div>
    </div>
  );
}
