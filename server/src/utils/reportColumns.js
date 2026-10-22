import { csvEscape } from "./playerCode.js";

export const REGISTRATION_REPORT_COLUMNS = [
  { id: "playerCode", header: "Player ID", default: true },
  { id: "fullName", header: "Name", default: true },
  { id: "interest", header: "Type", default: true },
  { id: "company", header: "Company", default: true },
  { id: "designation", header: "Designation", default: false },
  { id: "status", header: "Status", default: true },
  { id: "paymentStatus", header: "Payment", default: true },
  { id: "documentsVerification", header: "Documents Verification", default: false },
  { id: "referredBy", header: "Referred By", default: true },
  { id: "email", header: "Email", default: true },
  { id: "phone", header: "Phone", default: false },
  { id: "role", header: "Playing Role", default: false },
  { id: "paymentAmount", header: "Payment Amount", default: false },
  { id: "utr", header: "UTR", default: false },
  { id: "auctionStatus", header: "Auction Status", default: false },
  { id: "franchiseName", header: "Franchise", default: false },
  { id: "basePrice", header: "Base Price", default: false },
  { id: "soldPrice", header: "Sold Price", default: false },
  { id: "sponsorPackageTitle", header: "Sponsor Package", default: false },
  { id: "referredByPlayerCode", header: "Referred By Player ID", default: false },
  { id: "referredByName", header: "Referred By Name", default: false },
  { id: "adminNotes", header: "Admin Notes", default: false },
  { id: "createdAt", header: "Registered At", default: false },
  { id: "reviewedAt", header: "Reviewed At", default: false },
];

const COLUMN_BY_ID = new Map(REGISTRATION_REPORT_COLUMNS.map((c) => [c.id, c]));

export const DEFAULT_REGISTRATION_REPORT_COLUMN_IDS = REGISTRATION_REPORT_COLUMNS.filter((c) => c.default).map(
  (c) => c.id
);

const VALID_COLUMN_IDS = new Set(REGISTRATION_REPORT_COLUMNS.map((c) => c.id));

export function parseReportColumnIds(raw) {
  if (raw == null || String(raw).trim() === "") {
    return [...DEFAULT_REGISTRATION_REPORT_COLUMN_IDS];
  }
  const ids = String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter((id) => VALID_COLUMN_IDS.has(id));
  return ids.length ? ids : [...DEFAULT_REGISTRATION_REPORT_COLUMN_IDS];
}

function paymentStatusValue(reg) {
  return String(reg.paymentStatus || reg.payment?.status || "").trim();
}

function documentsVerificationValue(reg) {
  const s = String(reg.documentsVerificationStatus || "none").toLowerCase();
  const hasUploads =
    (reg.playerDocuments?.length || 0) > 0 || Boolean(String(reg.paymentUtr || "").trim());
  if (s === "verified") return "Documents verified";
  if (s === "rejected") return "Documents rejected";
  if (s === "in_progress") return "In progress";
  if (hasUploads && s === "none") return "In progress";
  return "";
}

export function registrationReportCell(reg, columnId) {
  switch (columnId) {
    case "playerCode":
      return reg.playerCode || "";
    case "fullName":
      return reg.fullName || "";
    case "interest":
      return reg.interest || "";
    case "company":
      return reg.company || "";
    case "designation":
      return reg.designation || "";
    case "status":
      return reg.status === "verified" ? "accepted" : reg.status || "";
    case "paymentStatus":
      return paymentStatusValue(reg);
    case "documentsVerification":
      return documentsVerificationValue(reg);
    case "referredBy": {
      const code = reg.referredByPlayerCode || "";
      const name = reg.referredByName || "";
      if (code && name) return `${code} · ${name}`;
      return code || name || "";
    }
    case "email":
      return reg.email || "";
    case "phone":
      return String(reg.interest || "").toLowerCase() === "franchise" ? "" : reg.phone || "";
    case "role":
      return reg.role || "";
    case "paymentAmount":
      return reg.payment?.amountInr ?? "";
    case "utr":
      return reg.utrNumber || "";
    case "auctionStatus":
      return reg.auctionStatus || "";
    case "franchiseName":
      return reg.franchiseName || "";
    case "basePrice":
      return reg.basePrice ?? "";
    case "soldPrice":
      return reg.soldPrice ?? "";
    case "sponsorPackageTitle":
      return reg.sponsorPackageTitle || "";
    case "referredByPlayerCode":
      return reg.referredByPlayerCode || "";
    case "referredByName":
      return reg.referredByName || "";
    case "adminNotes":
      return reg.adminNotes || "";
    case "createdAt":
      return reg.createdAt ? new Date(reg.createdAt).toISOString() : "";
    case "reviewedAt":
      return reg.reviewedAt ? new Date(reg.reviewedAt).toISOString() : "";
    default:
      return "";
  }
}

export function buildRegistrationsCsv(rows, columnIds = DEFAULT_REGISTRATION_REPORT_COLUMN_IDS) {
  const ids = Array.isArray(columnIds)
    ? columnIds.filter((id) => VALID_COLUMN_IDS.has(id))
    : parseReportColumnIds(columnIds);
  const resolved = ids.length ? ids : [...DEFAULT_REGISTRATION_REPORT_COLUMN_IDS];
  const headers = resolved.map((id) => COLUMN_BY_ID.get(id)?.header || id);
  const lines = [headers.join(",")];
  for (const reg of rows) {
    lines.push(resolved.map((id) => csvEscape(registrationReportCell(reg, id))).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}`;
}
