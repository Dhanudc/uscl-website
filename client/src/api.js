const API_BASE = String(import.meta.env.VITE_API_URL || "")
  .trim()
  .replace(/\/$/, "");

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isForm && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}
