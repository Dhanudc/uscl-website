const TELANGANA = "telangana";

function roundPaise(n) {
  return Math.round(Number(n) || 0);
}

export function paiseToInr(paise) {
  return roundPaise(paise) / 100;
}

export function inrToPaise(inr) {
  return roundPaise(Number(inr) * 100);
}

export function splitGstForState(taxablePaise, gstRateBps, deliveryState, registeredState) {
  const rate = Number(gstRateBps) || 0;
  const taxable = roundPaise(taxablePaise);
  if (rate <= 0 || taxable <= 0) {
    return { cgstPaise: 0, sgstPaise: 0, igstPaise: 0, gstPaise: 0 };
  }
  const gstPaise = roundPaise((taxable * rate) / 10000);
  const state = String(deliveryState || "").trim().toLowerCase();
  const reg = String(registeredState || TELANGANA).trim().toLowerCase();
  if (state === reg) {
    const half = roundPaise(gstPaise / 2);
    return { cgstPaise: half, sgstPaise: gstPaise - half, igstPaise: 0, gstPaise };
  }
  return { cgstPaise: 0, sgstPaise: 0, igstPaise: gstPaise, gstPaise };
}

/** Build cart quote from DB-backed line items. */
export function computeStoreQuote({
  lines,
  settings,
  coupon,
  deliveryState,
  billType,
}) {
  let subtotalPaise = 0;
  const computedLines = [];

  for (const line of lines) {
    const unit = roundPaise(line.unitPricePaise);
    const qty = Math.max(1, Number(line.quantity) || 1);
    const lineSub = unit * qty;
    subtotalPaise += lineSub;
    computedLines.push({ ...line, unitPricePaise: unit, quantity: qty, lineSubtotalPaise: lineSub });
  }

  let discountPaise = 0;
  if (coupon) {
    if (coupon.type === "fixed") {
      discountPaise = Math.min(subtotalPaise, roundPaise(coupon.value));
    } else if (coupon.type === "percent") {
      const raw = roundPaise((subtotalPaise * Number(coupon.value)) / 100);
      const cap = coupon.maxDiscountPaise != null ? roundPaise(coupon.maxDiscountPaise) : raw;
      discountPaise = Math.min(subtotalPaise, Math.min(raw, cap));
    }
  }

  const afterDiscount = Math.max(0, subtotalPaise - discountPaise);
  const thresholdBase = settings.freeDeliveryAfterDiscount ? afterDiscount : subtotalPaise;
  const deliveryFeePaise =
    thresholdBase >= roundPaise(settings.freeDeliveryThresholdPaise)
      ? 0
      : roundPaise(settings.deliveryFeePaise);

  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;

  if (billType === "gst") {
    for (const line of computedLines) {
      const taxable = line.lineSubtotalPaise;
      const split = splitGstForState(
        taxable,
        line.gstRateBps,
        deliveryState,
        settings.gstRegisteredState
      );
      line.taxablePaise = taxable;
      line.cgstPaise = split.cgstPaise;
      line.sgstPaise = split.sgstPaise;
      line.igstPaise = split.igstPaise;
      cgstPaise += split.cgstPaise;
      sgstPaise += split.sgstPaise;
      igstPaise += split.igstPaise;
    }
    if (deliveryFeePaise > 0 && settings.deliveryFeeTaxable) {
      const split = splitGstForState(
        deliveryFeePaise,
        settings.deliveryGstRateBps,
        deliveryState,
        settings.gstRegisteredState
      );
      cgstPaise += split.cgstPaise;
      sgstPaise += split.sgstPaise;
      igstPaise += split.igstPaise;
    }
  }

  const totalPaise =
    afterDiscount + deliveryFeePaise + cgstPaise + sgstPaise + igstPaise;

  return {
    lines: computedLines,
    subtotalPaise,
    discountPaise,
    deliveryFeePaise,
    cgstPaise,
    sgstPaise,
    igstPaise,
    totalPaise,
    afterDiscountPaise: afterDiscount,
  };
}
