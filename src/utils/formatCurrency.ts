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

/**
 * Format a number as currency with the specified currency type
 * @param value - The numeric value to format
 * @param currency - The currency type ("GBP" or "EUR")
 * @returns Formatted string with appropriate currency symbol
 */
export function formatCurrency(value: number, currency: "GBP" | "EUR" = "GBP"): string {
  if (currency === "EUR") {
    return formatCurrencyEUR(value);
  }
  return formatCurrencyGBP(value);
}

/**
 * Format a number as whole currency with the specified currency type
 * @param value - The numeric value to format
 * @param currency - The currency type ("GBP" or "EUR")
 * @returns Formatted string with appropriate currency symbol (no decimals)
 */
export function formatCurrencyWhole(value: number, currency: "GBP" | "EUR" = "GBP"): string {
  if (currency === "EUR") {
    return formatCurrencyEURWhole(value);
  }
  return formatCurrencyGBPWhole(value);
}

/**
 * Calculate price excluding VAT from price including VAT
 * @param priceIncVat - The price including VAT
 * @param vatRate - The VAT rate as a percentage (e.g., 13.5 for 13.5%)
 * @returns The price excluding VAT
 */
export function calculateExVat(priceIncVat: number, vatRate: number): number {
  return priceIncVat / (1 + (vatRate / 100));
}

/**
 * Calculate VAT amount from price including VAT
 * @param priceIncVat - The price including VAT
 * @param vatRate - The VAT rate as a percentage (e.g., 13.5 for 13.5%)
 * @returns The VAT amount
 */
export function calculateVatAmount(priceIncVat: number, vatRate: number): number {
  const exVat = calculateExVat(priceIncVat, vatRate);
  return priceIncVat - exVat;
}

/**
 * Get VAT rate for a specific unit type from development settings
 * @param vatRates - The VAT rates object from development
 * @param unitType - The unit type to get rate for
 * @returns The VAT rate (defaults to 13.5 if not found)
 */
export function getVatRateForUnit(vatRates: { [key: string]: number } | undefined, unitType: string): number {
  if (vatRates && vatRates[unitType] !== undefined) {
    return vatRates[unitType];
  }
  return 13.5; // Default VAT rate
}

/**
 * Get currency symbol
 * @param currency - The currency type
 * @returns The currency symbol
 */
export function getCurrencySymbol(currency: "GBP" | "EUR" = "GBP"): string {
  return currency === "EUR" ? "€" : "£";
}
