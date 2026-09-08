export function phoneToWhatsAppHref(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 10) return "";
  return `https://wa.me/${digits}`;
}

export function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}
