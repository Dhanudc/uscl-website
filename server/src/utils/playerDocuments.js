import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { withProfileImageUrl } from "../middleware/upload.js";
import { docKeyBaseFamily, familyVersionNumber, hasDocFamily } from "./playerDocumentVersions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PLAYER_DOCUMENTS_DIR = path.join(__dirname, "../../private/player-documents");

fs.mkdirSync(PLAYER_DOCUMENTS_DIR, { recursive: true });

export const REQUIRED_DOC_KEYS = [
  "pan",
  "aadhar_front",
  "aadhar_back",
  "payslip_1",
  "payslip_2",
  "payslip_3",
];

export const DOC_FIELD_NAMES = [
  "pan",
  "aadhar_front",
  "aadhar_back",
  "payslip_1",
  "payslip_2",
  "payslip_3",
  "bank_statement",
  "payment_utr",
  "payment_attachment",
];

export function docKeyFromFilename(playerCode, filename) {
  const code = normalizePlayerCode(playerCode);
  const base = path.basename(String(filename || ""));
  const prefix = `${code}_`;
  if (!base.startsWith(prefix)) return "";
  return base.slice(prefix.length).replace(/\.[^.]+$/, "");
}

export function normalizePlayerCode(code) {
  const raw = String(code || "").trim();
  if (!raw) return "player";
  return raw.replace(/[^a-zA-Z0-9_-]/g, "") || "player";
}

export function isPlayerOrCaptain(reg) {
  const interest = String(reg?.interest || "").toLowerCase();
  return interest === "player" || interest === "captain";
}

/** Pending or accepted (verified) player/captain — admin document actions. */
export function canAdminManagePlayerDocuments(reg) {
  if (!isPlayerOrCaptain(reg)) return false;
  const status = String(reg?.status || "").toLowerCase();
  return status === "pending" || status === "verified";
}

export const REQUESTABLE_DOC_KEYS = [
  "pan",
  "aadhar_front",
  "aadhar_back",
  "payslip_1",
  "payslip_2",
  "payslip_3",
  "bank_statement",
  "payment_utr",
  "payment_attachment",
];

export function normalizeRequestedDocKeys(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const out = [];
  for (const item of list) {
    const key = String(item || "").trim().toLowerCase();
    if (REQUESTABLE_DOC_KEYS.includes(key) && !out.includes(key)) out.push(key);
  }
  return out;
}

export function hasPendingDocumentRequests(reg) {
  return normalizeRequestedDocKeys(reg?.documentsRequestedFromPlayer).length > 0;
}

export function shouldShowAddDocuments(reg, { playerDocumentsUploadEnabled = true } = {}) {
  if (!canAdminManagePlayerDocuments(reg)) return false;
  if (!playerDocumentsUploadEnabled) return false;
  const override = String(reg.documentsButtonOverride || "auto").toLowerCase();
  if (override === "hide") return false;
  if (override === "show") return true;
  if (hasPendingDocumentRequests(reg)) return true;
  const base = Number(reg.basePrice || 0);
  if (Number.isFinite(base) && base > 0) return false;
  if (arePlayerDocumentsComplete(reg)) return false;
  return true;
}

export function listPlayerDocuments(reg) {
  return Array.isArray(reg?.playerDocuments) ? reg.playerDocuments : [];
}

export function normalizePaymentUtr(raw) {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, "")
    .slice(0, 64);
}

export function hasDocKey(reg, docKey) {
  const base = docKeyBaseFamily(docKey);
  if (base === "payment_utr" && normalizePaymentUtr(reg?.paymentUtr)) {
    return true;
  }
  return hasDocFamily(reg, base);
}

export function bankStatementCount(reg) {
  return listPlayerDocuments(reg).filter((row) => String(row.docKey || "").startsWith("bank_statement")).length;
}

/** Required for “complete” — bank statement is optional. */
export function arePlayerDocumentsComplete(reg) {
  for (const key of REQUIRED_DOC_KEYS) {
    if (!hasDocFamily(reg, key)) return false;
  }
  return true;
}

export { docKeyBaseFamily, familyVersionNumber, hasDocFamily } from "./playerDocumentVersions.js";

export function playerDocumentDiskPath(filename) {
  const safe = path.basename(String(filename || "").replace(/\\/g, "/"));
  if (!safe || safe === "." || safe === "..") return null;
  const full = path.join(PLAYER_DOCUMENTS_DIR, safe);
  if (!full.startsWith(PLAYER_DOCUMENTS_DIR)) return null;
  return full;
}

export function removePlayerDocumentFile(filename) {
  const full = playerDocumentDiskPath(filename);
  if (!full) return;
  try {
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch {
    // ignore
  }
}

export function enrichRegistration(reg, { playerDocumentsUploadEnabled = true } = {}) {
  const plain = withProfileImageUrl(reg);
  plain.showAddDocumentsButton = shouldShowAddDocuments(plain, { playerDocumentsUploadEnabled });
  plain.documentsComplete = arePlayerDocumentsComplete(plain);
  plain.playerDocuments = listPlayerDocuments(plain).map((row) => ({
    docKey: row.docKey,
    filename: row.filename,
    originalName: row.originalName,
    mimeType: row.mimeType,
    size: row.size,
    filePassword: row.filePassword || "",
    uploadedAt: row.uploadedAt || null,
  }));
  plain.documentsRequestedFromPlayer = normalizeRequestedDocKeys(plain.documentsRequestedFromPlayer);
  plain.hasPendingDocumentRequests = hasPendingDocumentRequests(plain);
  return plain;
}

export function mapEnrichedRegistrations(list, options = {}) {
  return (list || []).map((row) => enrichRegistration(row, options));
}

export async function playerDocumentsUploadContext() {
  const { getSiteSettings, isPlayerDocumentsUploadEnabled } = await import("../models/SiteSettings.js");
  const settings = await getSiteSettings();
  return { playerDocumentsUploadEnabled: isPlayerDocumentsUploadEnabled(settings) };
}

export async function enrichRegistrationAsync(reg) {
  const ctx = await playerDocumentsUploadContext();
  return enrichRegistration(reg, ctx);
}

export async function mapEnrichedRegistrationsAsync(list) {
  const ctx = await playerDocumentsUploadContext();
  return mapEnrichedRegistrations(list, ctx);
}

/** Player dashboard API — never expose internal admin notes. */
export function sanitizeRegistrationForPlayerPortal(reg) {
  if (!reg || typeof reg !== "object") return reg;
  const { adminNotes: _adminNotes, ...rest } = reg;
  return rest;
}

export async function enrichRegistrationForPlayerAsync(reg) {
  return sanitizeRegistrationForPlayerPortal(await enrichRegistrationAsync(reg));
}

export async function mapEnrichedRegistrationsForPlayerAsync(list) {
  const rows = await mapEnrichedRegistrationsAsync(list);
  return rows.map(sanitizeRegistrationForPlayerPortal);
}

export function collectUploadedDocumentFiles(files) {
  const out = [];
  if (!files || typeof files !== "object") return out;
  for (const rows of Object.values(files)) {
    if (Array.isArray(rows)) out.push(...rows);
  }
  return out;
}

export function parseDocumentPasswords(body) {
  const raw = body?.documentPasswords;
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function listMissingRequiredDocKeys(reg) {
  const missing = [];
  for (const key of REQUIRED_DOC_KEYS) {
    if (!hasDocKey(reg, key)) missing.push(key);
  }
  return missing;
}

/** Field keys uploaded in this multipart request (multer files object). */
export function uploadedDocumentFieldNames(multerFiles) {
  if (!multerFiles || typeof multerFiles !== "object") return [];
  return Object.keys(multerFiles).filter((name) => {
    const rows = multerFiles[name];
    return Array.isArray(rows) && rows.length > 0;
  });
}

export function satisfyDocumentRequests(registration, uploadedFields) {
  const fields = new Set(uploadedFields.map((f) => String(f).toLowerCase()));
  if (!fields.size) return;
  const remaining = normalizeRequestedDocKeys(registration.documentsRequestedFromPlayer).filter(
    (key) => !fields.has(key)
  );
  registration.documentsRequestedFromPlayer = remaining;
  if (!remaining.length) {
    registration.documentsRequestedAt = null;
    registration.documentsRequestedBy = "";
  }
}

/**
 * Merge multer uploads into registration.playerDocuments.
 * partial: merge with existing; only validate uploaded files present.
 */
export function applyPlayerDocumentFiles(registration, multerFiles, options = {}) {
  const { partial = false, passwords = {} } = options;
  const uploaded = collectUploadedDocumentFiles(multerFiles);
  if (!uploaded.length) {
    return { error: "Please choose at least one file to upload." };
  }

  const code = normalizePlayerCode(registration.playerCode);
  const list = [...(registration.playerDocuments || [])];

  const uploadedKeys = [];
  const now = new Date();
  for (const file of uploaded) {
    const docKey =
      docKeyFromFilename(code, file.filename) ||
      String(file.fieldname || "").replace(/^bank_statement$/, "bank_statement_1");
    if (!docKey) continue;
    uploadedKeys.push(docKey);

    const fieldName = String(file.fieldname || "");
    const pwdRaw =
      passwords[docKey] ??
      passwords[fieldName] ??
      (docKey.startsWith("bank_statement") ? passwords.bank_statement : undefined) ??
      "";
    const filePassword = String(pwdRaw || "").trim();

    list.push({
      docKey,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      filePassword: docKey.startsWith("bank_statement") ? filePassword : "",
      uploadedAt: now,
    });
  }

  registration.playerDocuments = list;

  if (!partial) {
    for (const key of REQUIRED_DOC_KEYS) {
      if (!hasDocKey(registration, key)) {
        return { error: `Missing required document: ${key.replace(/_/g, " ")}.` };
      }
    }
  }

  registration.documentsSubmittedAt = arePlayerDocumentsComplete(registration) ? new Date() : null;
  return { error: null, uploadedKeys };
}

/**
 * Apply multipart document upload: files + optional payment UTR text field.
 */
export function applyPlayerDocumentSubmission(registration, multerFiles, body, options = {}) {
  const passwords = parseDocumentPasswords(body);
  const uploaded = collectUploadedDocumentFiles(multerFiles);
  const utr = normalizePaymentUtr(body?.paymentUtr);

  if (utr) {
    registration.paymentUtr = utr;
  }

  if (!uploaded.length && !utr) {
    return { error: "Please choose at least one file or enter a payment UTR." };
  }

  let uploadedKeys = [];
  if (uploaded.length) {
    const applied = applyPlayerDocumentFiles(registration, multerFiles, {
      ...options,
      partial: true,
      passwords,
    });
    if (applied.error) {
      return applied;
    }
    uploadedKeys = applied.uploadedKeys || [];
  } else {
    registration.documentsSubmittedAt = arePlayerDocumentsComplete(registration) ? new Date() : null;
  }

  const satisfiedFields = uploadedDocumentFieldNames(multerFiles);
  if (utr) {
    satisfiedFields.push("payment_utr");
  }
  satisfyDocumentRequests(registration, satisfiedFields);

  return { error: null, uploadedKeys, satisfiedFields };
}

export const DOC_LABELS = {
  pan: "PAN card",
  aadhar_front: "Aadhaar — front",
  aadhar_back: "Aadhaar — back",
  payslip_1: "Payslip 1",
  payslip_2: "Payslip 2",
  payslip_3: "Payslip 3",
  payment_utr: "Payment UTR",
  payment_attachment: "Payment attachment",
};

export function documentLabel(docKey) {
  const key = String(docKey || "");
  const base = docKeyBaseFamily(key);
  const version = familyVersionNumber(key);
  let name = DOC_LABELS[base] || DOC_LABELS[key];
  if (!name) {
    if (base === "bank_statement") name = "Bank statement";
    else name = key.replace(/_/g, " ");
  }
  if (version > 1 || (base !== "bank_statement" && key !== base)) {
    return `${name} ${version}`;
  }
  if (base === "bank_statement") {
    return `Bank statement ${version}`;
  }
  return name;
}

export function formatDocumentUploadedAt(uploadedAt) {
  if (!uploadedAt) return "";
  const d = new Date(uploadedAt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
