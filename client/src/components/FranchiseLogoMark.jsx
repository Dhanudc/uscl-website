import {
  franchiseLogoDisplay,
  franchiseLogoPlateConfig,
  franchiseLogoSrc,
} from "../utils/franchiseLogoDisplay";

/**
 * Franchise logo with optional inner plate (e.g. Norwin Atlanta Lions on black matte, white surround).
 * @param {{ team: { id?: string, image: string, logoInnerPlateBackground?: string, logoInnerPlateSizePercent?: number }, variant?: string, className?: string, style?: object, imgClassName?: string, imgStyle?: object, alt?: string, loading?: string, decoding?: string }} props
 */
export default function FranchiseLogoMark({
  team,
  variant = "inline",
  className = "",
  style,
  imgClassName = "",
  imgStyle,
  alt = "",
  loading,
  decoding,
}) {
  if (!team?.image) return null;

  const logoSrc = franchiseLogoSrc(team, variant);
  const display = franchiseLogoDisplay(team.id);
  const surfaceScale =
    variant === "ribbon"
      ? display.ribbonScale ?? 1
      : variant === "pennant"
        ? display.pennantScale ?? 1
        : 1;
  const surfaceTransform =
    surfaceScale !== 1 ? `scale(${surfaceScale})` : undefined;

  const plate = franchiseLogoPlateConfig(team, variant);
  if (!plate) {
    return (
      <img
        src={logoSrc}
        alt={alt}
        className={imgClassName || className}
        style={{
          ...(style || imgStyle),
          transform: [style?.transform || imgStyle?.transform, surfaceTransform]
            .filter(Boolean)
            .join(" "),
        }}
        loading={loading}
        decoding={decoding}
      />
    );
  }

  const { background, sizePercent, zoom, padding } = plate;
  const zoomTransform = zoom !== 1 ? `scale(${zoom})` : undefined;

  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-white ${className}`}
      style={style}
    >
      <div
        className="relative flex max-h-full max-w-full shrink-0 items-center justify-center"
        style={{
          width: `${sizePercent}%`,
          aspectRatio: "1",
          background,
        }}
      >
        <img
          src={logoSrc}
          alt={alt}
          className={`h-full w-full object-contain ${imgClassName}`}
          style={{
            ...imgStyle,
            padding,
            boxSizing: "border-box",
            transform: zoomTransform
              ? [imgStyle?.transform, zoomTransform].filter(Boolean).join(" ")
              : imgStyle?.transform,
          }}
          loading={loading}
          decoding={decoding}
        />
      </div>
    </div>
  );
}
