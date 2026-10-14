const VERSIONED_BASES = new Set([
  "pan",
  "aadhar_front",
  "aadhar_back",
  "payslip_1",
  "payslip_2",
  "payslip_3",
  "hr_noc",
  "payment_utr",
  "payment_attachment",
]);

function docsOf(reg) {
  return Array.isArray(reg?.playerDocuments) ? reg.playerDocuments : [];
}

export function docKeyBaseFamily(docKey) {
  const key = String(docKey || "");
  if (key.startsWith("bank_statement")) return "bank_statement";
  for (const base of VERSIONED_BASES) {
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

export function hasDocFamily(reg, baseKey) {
  const base = String(baseKey || "");
  return docsOf(reg).some((row) => docKeyBaseFamily(row.docKey) === base);
}

export function nextBankStatementKey(reg) {
  const existing = docsOf(reg)
    .map((row) => row.docKey)
    .filter((key) => String(key).startsWith("bank_statement_"));
  let max = 0;
  for (const key of existing) {
    const match = String(key).match(/bank_statement_(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `bank_statement_${max + 1}`;
}

/** Next storage key for a field (keeps prior uploads; pan → pan_2 → pan_3 …). */
export function nextVersionedDocKey(reg, fieldName) {
  const field = String(fieldName || "").trim();
  if (field === "bank_statement") {
    return nextBankStatementKey(reg);
  }
  if (!VERSIONED_BASES.has(field)) {
    return field;
  }

  let max = 0;
  for (const row of docsOf(reg)) {
    const key = String(row.docKey || "");
    if (key === field) max = Math.max(max, 1);
    else if (key.startsWith(`${field}_`)) {
      const n = Number(key.slice(field.length + 1));
      if (Number.isFinite(n)) max = Math.max(max, n);
    }
  }
  if (max === 0) return field;
  return `${field}_${max + 1}`;
}
