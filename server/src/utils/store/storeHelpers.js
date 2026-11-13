export function slugify(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function normalizeSearchText(...parts) {
  return parts
    .flatMap((p) => String(p || "").split(/\s+/))
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function nextProductCode(settingsDoc) {
  settingsDoc.productCodeSeq = (settingsDoc.productCodeSeq || 0) + 1;
  await settingsDoc.save();
  const n = String(settingsDoc.productCodeSeq).padStart(4, "0");
  return `JG-${n}`;
}

export function sizeCodeForProduct(productCode, sizeLabel) {
  const size = String(sizeLabel || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  return `${productCode}-${size}`;
}

export async function rebuildProductSearchText(product, { brand, category, sizes = [] } = {}) {
  const sizeCodes = sizes.map((s) => s.sizeCode).join(" ");
  const sizeLabels = sizes.map((s) => s.sizeLabel).join(" ");
  product.searchText = normalizeSearchText(
    product.name,
    product.productCode,
    sizeCodes,
    sizeLabels,
    brand?.name,
    category?.name,
    product.description
  );
}
