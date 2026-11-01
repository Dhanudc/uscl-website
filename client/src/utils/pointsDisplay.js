/** Display net run rate like +0.450 or -0.120 */
export function formatNetRunRate(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.000";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(3)}`;
}
