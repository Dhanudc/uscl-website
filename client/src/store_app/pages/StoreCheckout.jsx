import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StoreHeader from "../StoreHeader";
import StoreApiErrorPanel from "../components/StoreApiErrorPanel";
import StoreRequireCustomer from "../components/StoreRequireCustomer";
import { useStoreCustomer } from "../StoreCustomerContext";
import { formatInr, storeApi } from "../storeApi";
import { storePath } from "../urls";
import { clearCart, loadCart } from "../cartStorage";

function StoreCheckoutInner() {
  const navigate = useNavigate();
  const { customer } = useStoreCustomer();
  const cart = loadCart();
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState("");
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [paying, setPaying] = useState(false);
  const [dummyPay, setDummyPay] = useState(import.meta.env.DEV);
  const [newAddress, setNewAddress] = useState({
    line1: "",
    city: "",
    state: "",
    postalCode: "",
  });

  function loadAddresses() {
    return storeApi("/api/store/customer/addresses").then((d) => {
      setAddresses(d.addresses || []);
      const def = (d.addresses || []).find((a) => a.isDefault);
      if (def) setAddressId(def._id || def.id);
    });
  }

  useEffect(() => {
    storeApi("/api/store/meta")
      .then((m) => {
        if (m?.dummyPaymentAvailable) setDummyPay(true);
      })
      .catch(() => {});
    loadAddresses().catch(() => {});
  }, []);

  useEffect(() => {
    if (!customer || !addressId || !cart.items.length) return;
    storeApi("/api/store/customer/checkout/quote", {
      method: "POST",
      body: JSON.stringify({
        items: cart.items.map((i) => ({ sizeId: i.sizeId, quantity: i.quantity })),
        addressId,
        couponCode: couponCode.trim() || undefined,
      }),
    })
      .then((d) => setQuote(d.quote))
      .catch((e) => setError(e.message));
  }, [customer, addressId, cart.items.length, couponCode]);

  async function pay() {
    setPaying(true);
    setError("");
    try {
      const d = await storeApi("/api/store/customer/checkout/pay", {
        method: "POST",
        body: JSON.stringify({
          items: cart.items.map((i) => ({ sizeId: i.sizeId, quantity: i.quantity })),
          addressId,
          totalPaise: quote?.totalPaise,
          idempotencyKey: crypto.randomUUID(),
          couponCode: couponCode.trim() || undefined,
          customerGstin: customerGstin.trim() || undefined,
          paymentMode: dummyPay ? "dummy" : "cashfree",
        }),
      });
      clearCart();
      if (d.dummyPayment) {
        /* test order */
      } else if (d.cashfree?.paymentSessionId) {
        alert("Cashfree session created. Complete payment in gateway (integrate Cashfree checkout JS).");
      }
      navigate(storePath("/account"));
    } catch (err) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
  }

  if (!cart.items.length) {
    return (
      <div className="min-h-[100dvh] bg-ink text-[color:var(--text)]">
        <StoreHeader />
        <p className="px-4 py-16 text-center text-[color:var(--text-muted)]">
          Cart is empty.{" "}
          <Link to={storePath("/")} className="text-accent">
            Shop
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-ink text-[color:var(--text)]">
      <StoreHeader />
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="font-display text-3xl text-[color:var(--title)]">Checkout</h1>
        <p className="mt-2 text-sm">Signed in as {customer?.email}</p>
        <label className="mt-4 block text-sm">
          Delivery address
          <select
            className="mt-1 w-full rounded border border-[color:var(--border)] bg-ink-card px-3 py-2"
            value={addressId}
            onChange={(e) => setAddressId(e.target.value)}
          >
            <option value="">Select…</option>
            {addresses.map((a) => {
              const id = a._id || a.id;
              return (
                <option key={id} value={id}>
                  {a.recipientName}, {a.city}
                </option>
              );
            })}
          </select>
        </label>
        {!addresses.length ? (
          <form
            className="mt-4 space-y-2 rounded border border-dashed border-[color:var(--border)] p-3 text-sm"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await storeApi("/api/store/customer/addresses", {
                  method: "POST",
                  body: JSON.stringify(newAddress),
                });
                await loadAddresses();
              } catch (err) {
                setError(err.message);
              }
            }}
          >
            <p className="text-xs text-[color:var(--text-muted)]">Add your first delivery address</p>
            <input
              placeholder="Address line"
              className="w-full rounded border border-[color:var(--border)] bg-ink-card px-3 py-2"
              value={newAddress.line1}
              onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
              required
            />
            <input
              placeholder="City"
              className="w-full rounded border border-[color:var(--border)] bg-ink-card px-3 py-2"
              value={newAddress.city}
              onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
              required
            />
            <input
              placeholder="State"
              className="w-full rounded border border-[color:var(--border)] bg-ink-card px-3 py-2"
              value={newAddress.state}
              onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
              required
            />
            <input
              placeholder="PIN"
              className="w-full rounded border border-[color:var(--border)] bg-ink-card px-3 py-2"
              value={newAddress.postalCode}
              onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
              required
            />
            <button type="submit" className="btn-ghost text-xs">
              Save address
            </button>
          </form>
        ) : null}
        <input
          placeholder="Coupon code"
          className="mt-4 w-full rounded border border-[color:var(--border)] bg-ink-card px-3 py-2 text-sm"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
        />
        <input
          placeholder="Your GSTIN (optional, for GST bill)"
          className="mt-2 w-full rounded border border-[color:var(--border)] bg-ink-card px-3 py-2 text-sm"
          value={customerGstin}
          onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
        />
        {quote ? (
          <div className="mt-6 space-y-1 text-sm">
            <p>Subtotal: {formatInr(quote.subtotalPaise)}</p>
            <p>Delivery: {formatInr(quote.deliveryFeePaise)}</p>
            <p>GST: {formatInr((quote.cgstPaise || 0) + (quote.sgstPaise || 0) + (quote.igstPaise || 0))}</p>
            <p className="text-lg font-semibold text-accent">Total: {formatInr(quote.totalPaise)}</p>
          </div>
        ) : null}
        {dummyPay ? (
          <p className="mt-4 rounded-lg border border-dashed border-accent/40 bg-ink-card/50 px-3 py-2 text-xs text-[color:var(--text-muted)]">
            Local development: payment is simulated (no Cashfree). Order is marked paid instantly.
          </p>
        ) : null}
        <button type="button" className="btn-primary mt-6" disabled={paying || !addressId} onClick={pay}>
          {paying ? "Processing…" : dummyPay ? "Complete test payment" : "Pay securely"}
        </button>
        {error ? (
          /cannot reach the api|port 5000|start the backend/i.test(error) ? (
            <div className="mt-4">
              <StoreApiErrorPanel message={error} title="Checkout unavailable" />
            </div>
          ) : (
            <p className="mt-4 text-sm text-accent">{error}</p>
          )
        ) : null}
      </div>
    </div>
  );
}

export default function StoreCheckout() {
  return (
    <StoreRequireCustomer>
      <StoreCheckoutInner />
    </StoreRequireCustomer>
  );
}
