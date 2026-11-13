import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setCartCustomerId } from "./cartStorage";
import { storeApi } from "./storeApi";

const StoreCustomerContext = createContext(null);

export function StoreCustomerProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await storeApi("/api/store/customer/me");
      const c = data.customer;
      setCustomer(c);
      setCartCustomerId(c?.id || null);
    } catch {
      setCustomer(null);
      setCartCustomerId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await storeApi("/api/store/customer/auth/logout", { method: "POST" });
    } catch {
      /* cookie cleared best-effort */
    }
    setCustomer(null);
    setCartCustomerId(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ customer, loading, refresh, logout, setCustomer }),
    [customer, loading, refresh, logout]
  );

  return <StoreCustomerContext.Provider value={value}>{children}</StoreCustomerContext.Provider>;
}

export function useStoreCustomer() {
  const ctx = useContext(StoreCustomerContext);
  if (!ctx) throw new Error("useStoreCustomer must be used within StoreCustomerProvider");
  return ctx;
}
