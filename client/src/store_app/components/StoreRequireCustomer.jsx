import { Navigate, useLocation } from "react-router-dom";
import { useStoreCustomer } from "../StoreCustomerContext";
import { storePath } from "../urls";

/** Redirect guests to sign-in; show nothing while session is loading. */
export default function StoreRequireCustomer({ children }) {
  const { customer, loading } = useStoreCustomer();
  const location = useLocation();

  if (loading) {
    return (
      <p className="px-4 py-16 text-center text-sm text-[color:var(--text-muted)]">Loading account…</p>
    );
  }

  if (!customer) {
    return <Navigate to={storePath("/signin")} replace state={{ from: location.pathname + location.search }} />;
  }

  return children;
}
