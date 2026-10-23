import type { Franchise } from "@/data/franchises";

type PlateVariant = "grid" | "pennant" | "ribbon" | "thumb" | "modal" | "inline";

const PLATE_ZOOM: Partial<Record<string, Partial<Record<PlateVariant, number>>>> = {
  "norwin-atlanta-lions": {
    grid: 1.72,
    pennant: 1.55,
    ribbon: 1.48,
    thumb: 1.72,
    modal: 1.42,
    inline: 1.72,
  },
};

const PLATE_SIZE: Partial<Record<PlateVariant, number>> = {
  grid: 74,
  pennant: 86,
  ribbon: 80,
  thumb: 78,
  modal: 82,
  inline: 74,
};

function plateConfig(team: Franchise, variant: PlateVariant) {
  if (!team.logoInnerPlateBackground) return null;
  const zoom = PLATE_ZOOM[team.id]?.[variant] ?? 1;
  return {
    background: team.logoInnerPlateBackground,
    sizePercent: team.logoInnerPlateSizePercent ?? PLATE_SIZE[variant] ?? 74,
    zoom,
    padding: 8,
  };
}

export function FranchiseLogoMark({
  team,
  variant = "inline",
  className = "",
  style,
  imgClassName = "",
  imgStyle,
  alt = "",
}: {
  team: Franchise;
  variant?: PlateVariant;
  className?: string;
  style?: React.CSSProperties;
  imgClassName?: string;
  imgStyle?: React.CSSProperties;
  alt?: string;
}) {
  if (!team.image) return null;

  const plate = plateConfig(team, variant);
  if (!plate) {
    return (
      <img
        src={team.image}
        alt={alt}
        className={imgClassName || className}
        style={style || imgStyle}
      />
    );
  }

  const zoomTransform = plate.zoom !== 1 ? `scale(${plate.zoom})` : undefined;

  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-white ${className}`}
      style={style}
    >
      <div
        className="relative flex max-h-full max-w-full shrink-0 items-center justify-center"
        style={{
          width: `${plate.sizePercent}%`,
          aspectRatio: "1",
          background: plate.background,
        }}
      >
        <img
          src={team.image}
          alt={alt}
          className={`h-full w-full object-contain ${imgClassName}`}
          style={{
            ...imgStyle,
            padding: plate.padding,
            boxSizing: "border-box",
            transform: zoomTransform
              ? [imgStyle?.transform, zoomTransform].filter(Boolean).join(" ")
              : imgStyle?.transform,
          }}
        />
      </div>
    </div>
  );
}
