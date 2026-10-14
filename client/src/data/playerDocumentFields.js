import { registrationHasDocFamily } from "../utils/playerDocumentLabels.js";

export const PLAYER_DOCUMENT_FIELDS = [
  { key: "pan", label: "PAN card", multiple: false, needsPassword: false, section: "identity" },
  { key: "aadhar_front", label: "Aadhaar — front", multiple: false, needsPassword: false, section: "identity" },
  { key: "aadhar_back", label: "Aadhaar — back", multiple: false, needsPassword: false, section: "identity" },
  { key: "payslip_1", label: "Payslip 1", multiple: false, needsPassword: false, section: "payslips" },
  { key: "payslip_2", label: "Payslip 2", multiple: false, needsPassword: false, section: "payslips" },
  { key: "payslip_3", label: "Payslip 3", multiple: false, needsPassword: false, section: "payslips" },
  { key: "hr_noc", label: "HR NOC", multiple: false, needsPassword: false, section: "employment" },
  {
    key: "bank_statement",
    label: "Bank statement",
    multiple: true,
    needsPassword: false,
    section: "bank",
    optional: true,
  },
  {
    key: "payment_utr",
    label: "Payment UTR",
    inputType: "text",
    multiple: false,
    needsPassword: false,
    section: "payment",
    optional: true,
  },
  {
    key: "payment_attachment",
    label: "Payment attachment",
    multiple: false,
    needsPassword: false,
    section: "payment",
    optional: true,
  },
];

export const REQUIRED_PLAYER_FIELD_KEYS = PLAYER_DOCUMENT_FIELDS
  .filter((row) => !row.optional)
  .map((row) => row.key);

export function registrationHasDocKey(reg, fieldKey) {
  return registrationHasDocFamily(reg, fieldKey);
}

export function missingPlayerDocumentFields(reg) {
  return PLAYER_DOCUMENT_FIELDS.filter(
    (row) => !row.optional && !registrationHasDocKey(reg, row.key)
  );
}

/** What the player must upload on dashboard (admin request overrides missing-only list). */
export function playerUploadFieldRows(reg) {
  const requested = (reg?.documentsRequestedFromPlayer || []).map((k) => String(k).toLowerCase());
  if (requested.length) {
    return PLAYER_DOCUMENT_FIELDS.filter((row) => requested.includes(row.key));
  }
  return missingPlayerDocumentFields(reg);
}

export function fieldLabelByKey(key) {
  const row = PLAYER_DOCUMENT_FIELDS.find((r) => r.key === key);
  return row?.label || String(key || "").replace(/_/g, " ");
}
