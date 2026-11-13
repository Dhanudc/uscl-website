import { useEffect, useState } from "react";
import StoreHeader from "../StoreHeader";
import StoreApiErrorPanel from "../components/StoreApiErrorPanel";
import StoreRequireCustomer from "../components/StoreRequireCustomer";
import { formatInr, storeApi } from "../storeApi";

function StoreAccountInner() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storeApi("/api/store/customer/orders")
      .then((d) => setOrders(d.orders || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-[100dvh] bg-ink text-[color:var(--text)]">
      <StoreHeader />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl text-[color:var(--title)]">My orders</h1>
        {error ? (
          <div className="mt-4">
            <StoreApiErrorPanel message={error} title="Could not load orders" />
          </div>
        ) : null}
        {loading ? (
          <p className="mt-6 text-sm text-[color:var(--text-muted)]">Loading orders…</p>
        ) : orders.length === 0 && !error ? (
          <p className="mt-6 text-[color:var(--text-muted)]">You have no orders yet.</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {orders.map((o) => (
              <li key={o._id} className="rounded-xl border border-[color:var(--border)] p-4 text-sm">
                <p className="font-semibold">{o.orderNumber}</p>
                <p className="text-[color:var(--text-muted)]">
                  {o.orderStatus} · {o.paymentStatus}
                </p>
                <p className="text-accent">{formatInr(o.totalPaise)}</p>
                <ul className="mt-2 text-[color:var(--text-muted)]">
                  {(o.items || []).map((it, i) => (
                    <li key={i}>
                      {it.productCode} · {it.sizeCode} × {it.quantity}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function StoreAccount() {
  return (
    <StoreRequireCustomer>
      <StoreAccountInner />
    </StoreRequireCustomer>
  );
}
