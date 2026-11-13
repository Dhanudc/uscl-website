const LEGACY_KEY = "uscl_store_cart_v1";

let activeCustomerId = null;

export function setCartCustomerId(customerId) {
  activeCustomerId = customerId ? String(customerId) : null;
}

function cartStorageKey() {
  if (!activeCustomerId) return null;
  return `${LEGACY_KEY}_${activeCustomerId}`;
}

export function loadCart() {
  const key = cartStorageKey();
  if (!key) return { items: [] };
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { items: [] };
    const data = JSON.parse(raw);
    return { items: Array.isArray(data.items) ? data.items : [] };
  } catch {
    return { items: [] };
  }
}

export function saveCart(cart) {
  const key = cartStorageKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(cart));
}

export function clearCart() {
  const key = cartStorageKey();
  if (key) localStorage.removeItem(key);
}

export function cartItemCount() {
  return loadCart().items.reduce((n, i) => n + (i.quantity || 0), 0);
}
