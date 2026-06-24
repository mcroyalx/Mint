// Locale-style number formatting used across the UI (thousands '.', decimals ',').
export const formatNumber = (num: number, decimals?: number): string => {
  if (num === undefined || num === null || isNaN(num)) return "0";
  let str = decimals !== undefined ? num.toFixed(decimals) : num.toString();
  const parts = str.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return parts.join(",");
};
