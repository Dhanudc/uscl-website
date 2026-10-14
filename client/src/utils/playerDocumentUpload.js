/** Server accepts up to this size per file (direct upload to API, not Vercel proxy). */
export const PLAYER_DOCUMENT_MAX_FILE_MB = 50;

export const PLAYER_DOCUMENT_UPLOAD_SIZE_HINT = `Each file can be up to ${PLAYER_DOCUMENT_MAX_FILE_MB} MB (PDF or image).`;

const MAX_BYTES = PLAYER_DOCUMENT_MAX_FILE_MB * 1024 * 1024;

export function validatePlayerDocumentFiles(rowsToShow, files) {
  for (const row of rowsToShow) {
    if (row.inputType === "text") continue;
    const picked = files[row.key];
    if (!picked?.length) continue;
    for (const file of picked) {
      if (file.size > MAX_BYTES) {
        throw new Error(
          `${file.name || row.label} is too large. ${PLAYER_DOCUMENT_UPLOAD_SIZE_HINT}`
        );
      }
    }
  }
}

export function buildPlayerDocumentFormData({ rowsToShow, files, textValues, statementPassword }) {
  const formData = new FormData();
  const passwords = {};
  let hasPayload = false;

  validatePlayerDocumentFiles(rowsToShow, files);

  for (const row of rowsToShow) {
    if (row.inputType === "text") {
      const val = String(textValues[row.key] || "").trim();
      if (!val) continue;
      if (row.key === "payment_utr") {
        formData.set("paymentUtr", val);
        hasPayload = true;
      }
      continue;
    }

    const picked = files[row.key];
    if (!picked?.length) continue;

    hasPayload = true;
    if (row.multiple) {
      for (const file of picked) {
        formData.append("bank_statement", file);
      }
      const pwd = String(statementPassword || "").trim();
      if (pwd) passwords.bank_statement = pwd;
    } else {
      formData.append(row.key, picked[0]);
    }
  }

  if (Object.keys(passwords).length) {
    formData.set("documentPasswords", JSON.stringify(passwords));
  }

  if (!hasPayload) {
    return null;
  }
  return formData;
}
