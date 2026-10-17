const NAIRA = "\u20A6";

export function formatNaira(amount: number) {
  return `${NAIRA}${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(amount)}`;
}

export function formatCompactNaira(amount: number) {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `${NAIRA}${Number.isInteger(millions) ? millions : millions.toFixed(1)}m`;
  }
  return formatNaira(amount);
}