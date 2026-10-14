/** Per-file limit when uploading via the site (Vercel /api proxy → Render). */
export const PLAYER_DOCUMENT_MAX_FILE_MB = 4.5;

export const PLAYER_DOCUMENT_UPLOAD_SIZE_HINT =
  `Each file must be ${PLAYER_DOCUMENT_MAX_FILE_MB} MB or smaller. When you save, files upload one at a time — use compressed PDFs or smaller photos if upload fails.`;

/**
 * Split document FormData into one HTTP request per file so each stays under
 * Vercel's ~4.5MB proxy body limit (production /api → Render).
 */
export function buildPlayerDocumentUploadBatches({ rowsToShow, files, textValues, statementPassword }) {
  const batches = [];
  const pwd = String(statementPassword || "").trim();
  const passwordsJson =
    pwd ? JSON.stringify({ bank_statement: pwd }) : null;

  for (const row of rowsToShow) {
    if (row.inputType === "text") {
      const val = String(textValues[row.key] || "").trim();
      if (!val) continue;
      if (row.key === "payment_utr") {
        const fd = new FormData();
        fd.set("paymentUtr", val);
        batches.push(fd);
      }
      continue;
    }

    const picked = files[row.key];
    if (!picked?.length) continue;

    if (row.multiple) {
      for (const file of picked) {
        const fd = new FormData();
        fd.append("bank_statement", file);
        if (passwordsJson) fd.set("documentPasswords", passwordsJson);
        batches.push(fd);
      }
    } else {
      const fd = new FormData();
      fd.append(row.key, picked[0]);
      batches.push(fd);
    }
  }

  return batches;
}
