import { USCL_PRIMARY_LOGO } from "../data/brandAssets";
import ZoomableImage from "./ZoomableImage";

const PLATE =
  "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-white p-0.5 shadow-[0_1px_3px_rgba(0,0,0,0.12)]";

/** Shared Somireddy + USCL shield — consistent sizing across header, footer, admin, cards. */
export default function UsclLogoMark({
  variant = "header",
  className = "",
  imgClassName = "",
  alt = "USCL",
  zoomable = false,
}) {
  if (variant === "footer") {
    const plateClass = `inline-flex h-[7.25rem] w-[5.75rem] max-w-full items-center justify-center rounded-lg bg-white p-1 shadow-sm ${className}`.trim();
    const imgClass = `h-full w-full object-contain object-center ${imgClassName}`.trim();

    if (zoomable) {
      return (
        <ZoomableImage
          src={USCL_PRIMARY_LOGO}
          alt={alt}
          portraitCrop={false}
          buttonClassName={plateClass}
          className={imgClass}
          sizeClass="max-h-[min(92vh,720px)] max-w-[min(94vw,420px)]"
        />
      );
    }

    return (
      <span className={plateClass}>
        <img src={USCL_PRIMARY_LOGO} alt={alt} className={imgClass} width={92} height={116} />
      </span>
    );
  }

  const plateByVariant = {
    header: `${PLATE} h-11 w-10`,
    store: `${PLATE} h-11 w-10 sm:h-12 sm:w-11`,
    admin: `${PLATE} h-11 w-10`,
    mark: `${PLATE} h-9 w-8`,
  };

  const plateClass = plateByVariant[variant] || plateByVariant.header;

  return (
    <span className={`${plateClass} ${className}`.trim()}>
      <img
        src={USCL_PRIMARY_LOGO}
        alt={alt}
        className={`h-full w-full object-contain object-center ${imgClassName}`.trim()}
        width={44}
        height={52}
      />
    </span>
  );
}
