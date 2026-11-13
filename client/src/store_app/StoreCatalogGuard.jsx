import { createContext, useContext, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Store from "./Store";
import StoreHeader from "./StoreHeader";
import { storeApi } from "./storeApi";

const StoreShopContext = createContext({ apiOffline: false });

export function useStoreShop() {
  return useContext(StoreShopContext);
}

export function StoreApiOfflineBanner() {
  const { apiOffline } = useStoreShop();
  if (!apiOffline) return null;
  return (
    <div
      className="border-b border-accent/30 bg-accent/10 px-4 py-2 text-center text-xs text-[color:var(--text)]"
      role="status"
    >
      Backend not running — from the project folder run{" "}
      <code className="rounded bg-ink-card px-1 py-0.5 text-accent">npm run dev</code> or{" "}
      <code className="rounded bg-ink-card px-1 py-0.5 text-accent">npm run dev:server</code>{" "}
      (API port 5000). Sign in to save cart and orders to your account.
    </div>
  );
}

/** When store catalog is off, show coming-soon page instead of shop routes. */
export default function StoreCatalogGuard() {
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    storeApi("/api/store/meta")
      .then(setMeta)
      .catch((e) => {
        if (import.meta.env.DEV) {
          setMeta({ enabled: true, apiOffline: true });
          return;
        }
        setError(e.message || "Could not load store.");
      });
  }, []);

  if (meta?.enabled === false) {
    return <Store />;
  }

  if (!meta) {
    return (
      <div className="min-h-[100dvh] bg-ink text-[color:var(--text)]">
        <StoreHeader />
        <p className="px-4 py-20 text-center text-sm text-[color:var(--text-muted)]">
          {error || "Loading store…"}
        </p>
      </div>
    );
  }

  return (
    <StoreShopContext.Provider value={{ apiOffline: Boolean(meta.apiOffline) }}>
      <StoreApiOfflineBanner />
      <Outlet />
    </StoreShopContext.Provider>
  );
}
