/**
 * Currency formatting for Profit & Ops Engine.
 * Default: Indian Rupee (₹) for India D2C. Override via NEXT_PUBLIC_CURRENCY_SYMBOL.
 */
const SYMBOL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_CURRENCY_SYMBOL) || "₹";
const LOCALE = "en-IN";
const DEFAULT_DECIMALS = 2;

export const currencySymbol = SYMBOL;
export const isINR = SYMBOL === "₹";

/**
 * Format a number as currency (e.g. ₹1,234.56 or $1,234.56).
 */
export function formatCurrency(
  value: number | null | undefined,
  options?: { minFractionDigits?: number; maxFractionDigits?: number }
): string {
  if (value == null || Number.isNaN(value)) return `${SYMBOL}0.00`;
  const min = options?.minFractionDigits ?? DEFAULT_DECIMALS;
  const max = options?.maxFractionDigits ?? DEFAULT_DECIMALS;
  const formatted = Math.abs(value).toLocaleString(LOCALE, {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
  const prefix = value < 0 ? "-" : "";
  return `${prefix}${SYMBOL}${formatted}`;
}

/**
 * Format for display in tables/cards (no symbol if you want to show symbol once in header).
 */
export function formatAmount(
  value: number | null | undefined,
  options?: { minFractionDigits?: number; maxFractionDigits?: number }
): string {
  if (value == null || Number.isNaN(value)) return "0.00";
  const min = options?.minFractionDigits ?? DEFAULT_DECIMALS;
  const max = options?.maxFractionDigits ?? DEFAULT_DECIMALS;
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
}
