function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function loadCashfreeScript() {
  return new Promise((resolve) => {
    if (window.Cashfree) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

async function openRazorpayCheckout(order, values) {
  const ready = await loadRazorpayScript();
  if (!ready || !window.Razorpay) {
    throw new Error("Unable to load Razorpay checkout.");
  }

  return new Promise((resolve) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency || "INR",
      name: "USCL T20",
      description: "Player registration fee",
      order_id: order.orderId,
      prefill: {
        name: values.fullName,
        email: values.email,
        contact: values.phone,
      },
      theme: { color: "#ff3d2e" },
      handler: (response) =>
        resolve({
          ok: true,
          provider: "razorpay",
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        }),
      modal: {
        ondismiss: () =>
          resolve({
            ok: false,
            reason: "Payment cancelled.",
          }),
      },
    });
    rzp.on("payment.failed", (resp) => {
      resolve({
        ok: false,
        reason: resp?.error?.description || "Payment failed.",
      });
    });
    rzp.open();
  });
}

async function openCashfreeCheckout(order) {
  const ready = await loadCashfreeScript();
  if (!ready || !window.Cashfree) {
    throw new Error("Unable to load Cashfree checkout.");
  }

  const cashfree = window.Cashfree({ mode: order.mode || "sandbox" });
  const result = await cashfree.checkout({
    paymentSessionId: order.paymentSessionId,
    redirectTarget: "_modal",
  });

  if (result?.error) {
    const reason = result.error.message || "Payment failed.";
    return {
      ok: false,
      reason: /cancel/i.test(reason) ? "Payment cancelled." : reason,
    };
  }

  const details = result?.paymentDetails || {};
  return {
    ok: true,
    provider: "cashfree",
    orderId: details.orderId || order.orderId,
    paymentId: details.paymentId || "",
    signature: "",
  };
}

export function paymentProviderLabel(provider) {
  return provider === "cashfree" ? "Cashfree" : "Razorpay";
}

export async function openPaymentCheckout(order, values) {
  const provider = order.provider || "razorpay";
  if (provider === "cashfree") {
    return openCashfreeCheckout(order);
  }
  return openRazorpayCheckout(order, values);
}

export function buildConfirmPaymentPayload(payment) {
  if (!payment?.ok) {
    const reason = payment?.reason || "Payment failed.";
    return {
      paymentStatus: /cancel/i.test(reason) ? "cancelled" : "failed",
    };
  }

  if (payment.provider === "cashfree") {
    return {
      cashfreeOrderId: payment.orderId,
      paymentProvider: "cashfree",
      paymentStatus: "paid",
    };
  }

  return {
    razorpayOrderId: payment.orderId,
    razorpayPaymentId: payment.paymentId,
    razorpaySignature: payment.signature,
    paymentProvider: "razorpay",
    paymentStatus: "paid",
  };
}

export function buildRegistrationPaymentFields(payment) {
  if (!payment) return {};
  if (payment.provider === "cashfree") {
    return {
      cashfreeOrderId: payment.orderId,
      paymentProvider: "cashfree",
    };
  }
  return {
    razorpayOrderId: payment.orderId,
    razorpayPaymentId: payment.paymentId,
    razorpaySignature: payment.signature,
    paymentProvider: "razorpay",
  };
}
