const DOC_LABELS = {
  pan: "PAN card",
  aadhar_front: "Aadhaar — front",
  aadhar_back: "Aadhaar — back",
  payslip_1: "Payslip 1",
  payslip_2: "Payslip 2",
  payslip_3: "Payslip 3",
  payment_utr: "Payment UTR",
  payment_attachment: "Payment attachment",
};

export function docKeyBaseFamily(docKey) {
  const key = String(docKey || "");
  if (key.startsWith("bank_statement")) return "bank_statement";
  for (const base of Object.keys(DOC_LABELS)) {
    if (key === base || key.startsWith(`${base}_`)) return base;
  }
  return key;
}

export function familyVersionNumber(docKey) {
  const key = String(docKey || "");
  const base = docKeyBaseFamily(key);
  if (base === "bank_statement") {
    const match = key.match(/^bank_statement_(\d+)$/);
    return match ? Number(match[1]) : 1;
  }
  if (key === base) return 1;
  const match = key.match(new RegExp(`^${base}_(\\d+)$`));
  return match ? Number(match[1]) : 1;
}

export function formatUploadedTime(uploadedAt) {
  if (!uploadedAt) return "";
  const d = new Date(uploadedAt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function documentDisplayLabel(row) {
  const docKey = row?.docKey || "";
  const base = docKeyBaseFamily(docKey);
  const version = familyVersionNumber(docKey);
  let name = DOC_LABELS[base];
  if (!name) {
    if (base === "bank_statement") name = `Bank statement ${version}`;
    else name = docKey.replace(/_/g, " ");
  } else if (base === "bank_statement") {
    name = `Bank statement ${version}`;
  } else if (version > 1 || docKey !== base) {
    name = `${name} ${version}`;
  }

  const time = formatUploadedTime(row?.uploadedAt);
  return time ? `${name} · ${time}` : name;
}

export function registrationHasDocFamily(reg, fieldKey) {
  const base = String(fieldKey || "");
  if (base === "payment_utr" && String(reg?.paymentUtr || "").trim()) {
    return true;
  }
  const docs = reg?.playerDocuments || [];
  return docs.some((row) => docKeyBaseFamily(row.docKey) === base);
}
