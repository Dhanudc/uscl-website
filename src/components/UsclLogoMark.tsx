import Image from "next/image";
import { USCL_PRIMARY_LOGO } from "@/data/brandAssets";

type Variant = "header" | "footer";

const plateClass =
  "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-white p-0.5 shadow-[0_1px_3px_rgba(0,0,0,0.12)]";

export function UsclLogoMark({ variant = "header", alt = "USCL" }: { variant?: Variant; alt?: string }) {
  if (variant === "footer") {
    return (
      <span className="inline-flex h-[7.25rem] w-[5.75rem] items-center justify-center rounded-lg bg-white p-1 shadow-sm">
        <Image
          src={USCL_PRIMARY_LOGO}
          alt={alt}
          width={92}
          height={116}
          className="h-full w-full object-contain object-center"
        />
      </span>
    );
  }

  return (
    <span className={`${plateClass} h-11 w-10`}>
      <Image
        src={USCL_PRIMARY_LOGO}
        alt={alt}
        width={44}
        height={52}
        className="h-full w-full object-contain object-center"
        priority
      />
    </span>
  );
}
