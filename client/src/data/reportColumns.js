import { getPaymentStatus, paymentStatusLabel } from "../utils/paymentStatus";

export const REPORT_STATUS_OPTIONS = [
  { id: "accepted", label: "Accepted / confirmed" },
  { id: "pending", label: "Pending" },
  { id: "rejected", label: "Rejected" },
];

export const REPORT_INTEREST_OPTIONS = [
  { id: "player", label: "Players" },
  { id: "captain", label: "Captains" },
  { id: "sponsor", label: "Sponsors" },
  { id: "franchise", label: "Franchise owners" },
];

export const REPORT_PAYMENT_OPTIONS = [
  { id: "paid", label: "Paid" },
  { id: "pending", label: "Pending" },
  { id: "failed", label: "Failed" },
  { id: "cancelled", label: "Cancelled" },
];

export const REPORT_AUCTION_OPTIONS = [
  { id: "not_listed", label: "Not listed" },
  { id: "unsold", label: "Unsold" },
  { id: "sold", label: "Sold" },
];

export const REPORT_DOC_STATUS_OPTIONS = [
  { id: "in_progress", label: "In progress" },
  { id: "verified", label: "Documents verified" },
  { id: "rejected", label: "Documents rejected" },
];

export function documentsVerificationReportLabel(reg) {
  const s = String(reg?.documentsVerificationStatus || "none").toLowerCase();
  const hasUploads =
    (reg?.playerDocuments?.length || 0) > 0 || Boolean(String(reg?.paymentUtr || "").trim());
  if (s === "verified") return "Documents verified";
  if (s === "rejected") return "Documents rejected";
  if (s === "in_progress") return "In progress";
  if (hasUploads && s === "none") return "In progress";
  return "—";
}

export const REGISTRATION_REPORT_COLUMNS = [
  { id: "playerCode", label: "Player ID", default: true },
  { id: "fullName", label: "Name", default: true },
  { id: "interest", label: "Type", default: true },
  { id: "company", label: "Company", default: true },
  { id: "designation", label: "Designation", default: false },
  { id: "status", label: "Status", default: true },
  { id: "paymentStatus", label: "Payment", default: true },
  { id: "documentsVerification", label: "Documents verification", default: false },
  { id: "referredBy", label: "Referred by", default: true },
  { id: "email", label: "Email", default: true },
  { id: "phone", label: "Phone", default: false },
  { id: "role", label: "Playing role", default: false },
  { id: "paymentAmount", label: "Payment amount", default: false },
  { id: "utr", label: "UTR", default: false },
  { id: "auctionStatus", label: "Auction status", default: false },
  { id: "franchiseName", label: "Franchise", default: false },
  { id: "basePrice", label: "Base price", default: false },
  { id: "soldPrice", label: "Sold price", default: false },
  { id: "sponsorPackageTitle", label: "Sponsor package", default: false },
  { id: "referredByPlayerCode", label: "Referred by player ID", default: false },
  { id: "referredByName", label: "Referred by name", default: false },
  { id: "adminNotes", label: "Admin notes", default: false },
  { id: "createdAt", label: "Registered at", default: false },
  { id: "reviewedAt", label: "Reviewed at", default: false },
];

export const DEFAULT_REPORT_COLUMN_IDS = REGISTRATION_REPORT_COLUMNS.filter((c) => c.default).map((c) => c.id);

export function formatReportCell(reg, columnId) {
  switch (columnId) {
    case "playerCode":
      return reg.playerCode || "—";
    case "fullName":
      return reg.fullName || "—";
    case "interest":
      return reg.interest || "—";
    case "company":
      return reg.company
        ? `${reg.company}${reg.designation ? ` · ${reg.designation}` : ""}`
        : reg.designation || "—";
    case "designation":
      return reg.designation || "—";
    case "status":
      return reg.status === "verified" ? "accepted" : reg.status || "—";
    case "paymentStatus":
      return paymentStatusLabel(getPaymentStatus(reg));
    case "documentsVerification":
      return documentsVerificationReportLabel(reg);
    case "referredBy":
      return reg.referredByPlayerCode
        ? `${reg.referredByPlayerCode}${reg.referredByName ? ` · ${reg.referredByName}` : ""}`
        : "—";
    case "email":
      return reg.email || "—";
    case "phone":
      return reg.phone || "—";
    case "role":
      return reg.role || "—";
    case "paymentAmount":
      return reg.payment?.amountInr != null ? String(reg.payment.amountInr) : "—";
    case "utr":
      return reg.utrNumber || "—";
    case "auctionStatus":
      return reg.auctionStatus || "—";
    case "franchiseName":
      return reg.franchiseName || "—";
    case "basePrice":
      return reg.basePrice != null ? String(reg.basePrice) : "—";
    case "soldPrice":
      return reg.soldPrice != null ? String(reg.soldPrice) : "—";
    case "sponsorPackageTitle":
      return reg.sponsorPackageTitle || "—";
    case "referredByPlayerCode":
      return reg.referredByPlayerCode || "—";
    case "referredByName":
      return reg.referredByName || "—";
    case "adminNotes":
      return reg.adminNotes || "—";
    case "createdAt":
      return reg.createdAt ? new Date(reg.createdAt).toLocaleString("en-IN") : "—";
    case "reviewedAt":
      return reg.reviewedAt ? new Date(reg.reviewedAt).toLocaleString("en-IN") : "—";
    default:
      return "—";
  }
}

export function initialReportFilterState() {
  const all = (options) => Object.fromEntries(options.map((o) => [o.id, true]));
  return {
    status: all(REPORT_STATUS_OPTIONS),
    interest: all(REPORT_INTEREST_OPTIONS),
    paymentStatus: all(REPORT_PAYMENT_OPTIONS),
    auctionStatus: all(REPORT_AUCTION_OPTIONS),
    docStatus: all(REPORT_DOC_STATUS_OPTIONS),
  };
}

export function initialReportColumnState() {
  return Object.fromEntries(REGISTRATION_REPORT_COLUMNS.map((c) => [c.id, c.default]));
}

function selectedIds(map, options) {
  const picked = options.filter((o) => map[o.id]).map((o) => o.id);
  if (picked.length === 0) return null;
  if (picked.length === options.length) return [];
  return picked;
}

export function validateReportFilters(filterMaps, columnMap) {
  const groups = [
    ["Status", filterMaps.status, REPORT_STATUS_OPTIONS],
    ["Type", filterMaps.interest, REPORT_INTEREST_OPTIONS],
    ["Payment", filterMaps.paymentStatus, REPORT_PAYMENT_OPTIONS],
    ["Auction", filterMaps.auctionStatus, REPORT_AUCTION_OPTIONS],
    ["Documents", filterMaps.docStatus, REPORT_DOC_STATUS_OPTIONS],
  ];
  for (const [label, map, options] of groups) {
    if (!options.some((o) => map[o.id])) {
      return `Select at least one ${label} option.`;
    }
  }
  if (!REGISTRATION_REPORT_COLUMNS.some((c) => columnMap[c.id])) {
    return "Select at least one column for preview and export.";
  }
  return null;
}

export function buildReportQueryParams(filterMaps, columnMap) {
  const qs = new URLSearchParams();
  const status = selectedIds(filterMaps.status, REPORT_STATUS_OPTIONS);
  if (status?.length) qs.set("status", status.join(","));
  const interest = selectedIds(filterMaps.interest, REPORT_INTEREST_OPTIONS);
  if (interest?.length) qs.set("interest", interest.join(","));
  const payment = selectedIds(filterMaps.paymentStatus, REPORT_PAYMENT_OPTIONS);
  if (payment?.length) qs.set("paymentStatus", payment.join(","));
  const auction = selectedIds(filterMaps.auctionStatus, REPORT_AUCTION_OPTIONS);
  if (auction?.length) qs.set("auctionStatus", auction.join(","));
  const docStatus = selectedIds(filterMaps.docStatus, REPORT_DOC_STATUS_OPTIONS);
  if (docStatus?.length) qs.set("docStatus", docStatus.join(","));
  const fields = REGISTRATION_REPORT_COLUMNS.filter((c) => columnMap[c.id]).map((c) => c.id);
  if (fields.length) qs.set("fields", fields.join(","));
  return qs;
}
