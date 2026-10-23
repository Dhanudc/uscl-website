import { Link } from "react-router-dom";
import { isStoreHostname } from "./host";
import { mainSiteHomeUrl } from "./urls";

export default function StoreHeader() {
  const onStoreHost = isStoreHostname();
  const mainHref = mainSiteHomeUrl();

  const brandInner = (
    <>
      <span className="store-soon__brand-mark inline-flex h-11 w-[3.25rem] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm sm:h-12 sm:w-14">
        <img
          src="/brand/uscl-logo.png"
          alt=""
          className="max-h-[85%] max-w-[85%] object-contain"
          width={56}
          height={32}
        />
      </span>
      <span className="min-w-0 text-left leading-tight">
        <span className="font-display block text-base text-[color:var(--title)] sm:text-lg">
          USCL <span className="text-accent">Store</span>
        </span>
        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)] sm:text-[11px]">
          Season 2026 · Launching soon
        </span>
      </span>
    </>
  );

  return (
    <header className="store-soon__header relative z-20 shrink-0 border-b border-[color:var(--border)]/70 bg-[color:var(--ink)]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:gap-4 sm:px-8 md:py-2">
        {onStoreHost ? (
          <a href={mainHref} className="store-soon__brand flex min-w-0 items-center gap-3 no-underline">
            {brandInner}
          </a>
        ) : (
          <Link to="/home" className="store-soon__brand flex min-w-0 items-center gap-3 no-underline">
            {brandInner}
          </Link>
        )}

        {onStoreHost ? (
          <a href={mainHref} className="btn-ghost shrink-0 px-3 py-2 text-xs sm:text-sm">
            Main site
          </a>
        ) : (
          <Link to="/home" className="btn-ghost shrink-0 px-3 py-2 text-xs sm:text-sm">
            Main site
          </Link>
        )}
      </div>
    </header>
  );
}
