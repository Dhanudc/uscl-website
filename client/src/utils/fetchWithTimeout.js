const DEFAULT_TIMEOUT_MS = 20000;

export async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(
        `Request timed out (${Math.round(timeoutMs / 1000)}s). Start the API with npm run dev:server (port 5000).`
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function apiUnreachableMessage(apiBase) {
  return apiBase
    ? "Cannot reach the API. Check VITE_API_URL and that the backend is running."
    : "Cannot reach the API. Start the backend from the project root: npm run dev:server (port 5000).";
}
