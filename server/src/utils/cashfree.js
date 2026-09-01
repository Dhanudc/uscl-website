const API_VERSION = "2023-08-01";

function getBaseUrl(mode) {
  return mode === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
}

export function getCashfreeConfig() {
  const appId = String(process.env.CASHFREE_APP_ID || "").trim();
  const secretKey = String(process.env.CASHFREE_SECRET_KEY || "").trim();
  const mode =
    String(process.env.CASHFREE_ENV || "sandbox").trim().toLowerCase() === "production"
      ? "production"
      : "sandbox";
  return { appId, secretKey, mode, configured: Boolean(appId && secretKey) };
}

async function cashfreeFetch(path, { method = "GET", body } = {}) {
  const { appId, secretKey, mode } = getCashfreeConfig();
  if (!appId || !secretKey) {
    throw new Error("Cashfree is not configured. Add CASHFREE_APP_ID and CASHFREE_SECRET_KEY.");
  }

  const res = await fetch(`${getBaseUrl(mode)}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-client-id": appId,
      "x-client-secret": secretKey,
      "x-api-version": API_VERSION,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data?.message || data?.error?.message || `Cashfree API error (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export async function createCashfreeOrder({ orderId, amountInr, customer }) {
  const data = await cashfreeFetch("/orders", {
    method: "POST",
    body: {
      order_id: orderId,
      order_amount: amountInr,
      order_currency: "INR",
      customer_details: {
        customer_id: String(customer.id || customer.email || "guest"),
        customer_email: String(customer.email || ""),
        customer_phone: String(customer.phone || ""),
      },
    },
  });

  return {
    orderId: data.order_id,
    paymentSessionId: data.payment_session_id,
    amount: Math.round(amountInr * 100),
    currency: "INR",
  };
}

export async function verifyCashfreePayment(orderId) {
  if (!orderId) return { paid: false };

  const order = await cashfreeFetch(`/orders/${encodeURIComponent(orderId)}`);
  const status = String(order.order_status || "").toUpperCase();
  if (status !== "PAID") {
    return { paid: false, orderId };
  }

  let paymentId = "";
  try {
    const payments = await cashfreeFetch(`/orders/${encodeURIComponent(orderId)}/payments`);
    const list = Array.isArray(payments) ? payments : [];
    const success = list.find((p) => String(p.payment_status || "").toUpperCase() === "SUCCESS");
    paymentId = String(success?.cf_payment_id || list[0]?.cf_payment_id || order.cf_order_id || "");
  } catch {
    paymentId = String(order.cf_order_id || orderId);
  }

  return { paid: true, orderId, paymentId };
}
