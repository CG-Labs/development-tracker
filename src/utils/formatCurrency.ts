/**
 * Format a number as GBP currency with proper formatting
 * @param value - The numeric value to format
 * @returns Formatted string like "£1,234,567.00"
 */
export function formatCurrencyGBP(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a number as EUR currency with proper formatting
 * @param value - The numeric value to format
 * @returns Formatted string like "€1,234,567.00"
 */
export function formatCurrencyEUR(value: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a number as GBP currency without decimal places
 * @param value - The numeric value to format
 * @returns Formatted string like "£1,234,567"
 */
export function formatCurrencyGBPWhole(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number as EUR currency without decimal places
 * @param value - The numeric value to format
 * @returns Formatted string like "€1,234,567"
 */
export function formatCurrencyEURWhole(value: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number with thousands separator (no currency symbol)
 * @param value - The numeric value to format
 * @returns Formatted string like "1,234,567.00"
 */
export function formatNumberWithCommas(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
