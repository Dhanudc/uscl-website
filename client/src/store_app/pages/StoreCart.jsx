import { Link } from "react-router-dom";
import StoreHeader from "../StoreHeader";
import StoreRequireCustomer from "../components/StoreRequireCustomer";
import { formatInr, storeMediaUrl } from "../storeApi";
import { storePath } from "../urls";
import { loadCart, saveCart } from "../cartStorage";

function StoreCartInner() {
  const cart = loadCart();

  function updateQty(key, delta) {
    const next = loadCart();
    const item = next.items.find((i) => i.key === key);
    if (!item) return;
    item.quantity = Math.max(1, item.quantity + delta);
    saveCart(next);
    window.location.reload();
  }

  function remove(key) {
    const next = loadCart();
    next.items = next.items.filter((i) => i.key !== key);
    saveCart(next);
    window.location.reload();
  }

  const total = cart.items.reduce((n, i) => n + i.pricePaise * i.quantity, 0);

  return (
    <div className="min-h-[100dvh] bg-ink">
      <StoreHeader />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl text-[color:var(--title)]">Cart</h1>
        {cart.items.length === 0 ? (
          <p className="mt-6 text-[color:var(--text-muted)]">
            Your cart is empty.{" "}
            <Link to={storePath("/")} className="text-accent">
              Browse products
            </Link>
          </p>
        ) : (
          <>
            <ul className="mt-6 space-y-4">
              {cart.items.map((item) => (
                <li key={item.key} className="flex gap-4 rounded-xl border border-[color:var(--border)] p-3">
                  {item.image ? (
                    <img src={storeMediaUrl(item.image)} alt="" className="h-20 w-20 rounded bg-white object-contain" />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase text-[color:var(--text-muted)]">{item.productCode}</p>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-[color:var(--text-muted)]">
                      {item.sizeLabel} · {item.sizeCode}
                    </p>
                    <p className="text-accent">{formatInr(item.pricePaise * item.quantity)}</p>
                    <div className="mt-2 flex gap-2 text-sm">
                      <button type="button" onClick={() => updateQty(item.key, -1)}>
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => updateQty(item.key, 1)}>
                        +
                      </button>
                      <button type="button" className="text-accent" onClick={() => remove(item.key)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-right text-lg font-semibold">Subtotal: {formatInr(total)}</p>
            <Link to={storePath("/checkout")} className="btn-primary mt-4 inline-flex">
              Checkout
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function StoreCart() {
  return (
    <StoreRequireCustomer>
      <StoreCartInner />
    </StoreRequireCustomer>
  );
}
