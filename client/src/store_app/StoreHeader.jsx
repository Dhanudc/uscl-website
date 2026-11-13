import { Link, useNavigate } from "react-router-dom";
import { isStoreHostname } from "./host";
import UsclLogoMark from "../components/UsclLogoMark";
import { mainSiteHomeUrl, storePath } from "./urls";
import { useStoreCustomer } from "./StoreCustomerContext";
import { cartItemCount } from "./cartStorage";

export default function StoreHeader() {
  const navigate = useNavigate();
  const onStoreHost = isStoreHostname();
  const mainHref = mainSiteHomeUrl();
  const storeHome = storePath("/");
  const { customer, loading, logout } = useStoreCustomer();
  const cartCount = customer ? cartItemCount() : 0;

  async function onLogout() {
    await logout();
    navigate(storeHome);
  }

  const brandInner = (
    <>
      <UsclLogoMark variant="store" />
      <span className="min-w-0 text-left leading-tight">
        <span className="font-display block text-base text-[color:var(--title)] sm:text-lg">
          USCL <span className="text-accent">Store</span>
        </span>
        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)] sm:text-[11px]">
          Official merchandise
        </span>
      </span>
    </>
  );

  return (
    <header className="store-soon__header relative z-20 shrink-0 border-b border-[color:var(--border)]/70 bg-[color:var(--ink)]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:gap-4 sm:px-8 md:py-2">
        <Link to={storeHome} className="store-soon__brand flex min-w-0 items-center gap-3 no-underline">
          {brandInner}
        </Link>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {!loading && customer ? (
            <>
              <Link to={storePath("/cart")} className="btn-ghost px-3 py-2 text-xs sm:text-sm">
                Cart{cartCount > 0 ? ` (${cartCount})` : ""}
              </Link>
              <Link to={storePath("/account")} className="btn-ghost px-3 py-2 text-xs sm:text-sm">
                Orders
              </Link>
              <span className="hidden max-w-[8rem] truncate text-xs text-[color:var(--text-muted)] sm:inline">
                {customer.email}
              </span>
              <button type="button" className="btn-ghost px-3 py-2 text-xs sm:text-sm" onClick={onLogout}>
                Log out
              </button>
            </>
          ) : !loading ? (
            <>
              <Link to={storePath("/signin")} className="btn-ghost px-3 py-2 text-xs sm:text-sm">
                Sign in
              </Link>
              <Link to={storePath("/signup")} className="btn-primary px-3 py-2 text-xs sm:text-sm">
                Sign up
              </Link>
            </>
          ) : null}
          {onStoreHost ? (
            <a href={mainHref} className="btn-ghost px-3 py-2 text-xs sm:text-sm">
              Main site
            </a>
          ) : (
            <Link to="/home" className="btn-ghost px-3 py-2 text-xs sm:text-sm">
              Main site
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
