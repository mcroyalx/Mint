/**
 * Shared number, price, volume, and timestamp formatting utilities.
 */

/** Format a number with dot-separated thousands and comma decimal (European style). */
export function formatNumber(num: number, decimals?: number): string {
  if (num === undefined || num === null || isNaN(num)) return "0";
  let str = decimals !== undefined ? num.toFixed(decimals) : num.toString();
  const parts = str.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return parts.join(",");
}

/** Format a number with comma-separated thousands (US-style). Used in contracts/SDK context. */
export function formatNumberCompact(num: number): string {
  if (num === undefined || num === null || isNaN(num)) return "0";
  const parts = num.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

/** Format a price value with adaptive decimal precision based on magnitude. */
export function formatPrice(val: number): string {
  if (val >= 1000) return val.toLocaleString([], { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (val >= 10) return val.toFixed(3);
  if (val >= 1) return val.toFixed(4);
  return val.toFixed(5);
}

/** Format a volume value with K/M suffixes. */
export function formatVolume(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toFixed(0);
}

/** Format a short timestamp string: "MM/DD/YYYY HH:MM". */
export function formatTimestamp(date: Date = new Date()): string {
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString().slice(0, 5)}`;
}
