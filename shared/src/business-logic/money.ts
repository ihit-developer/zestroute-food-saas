/**
 * All monetary amounts are stored as integer minor units (e.g., paisa: 100 paisa = Rs. 1).
 * Floating-point arithmetic is strictly avoided for financial calculations.
 */
export const DEFAULT_CURRENCY = 'PKR';

export function formatMoney(
  minorUnits: number,
  currency: string = DEFAULT_CURRENCY,
  showDecimals: boolean = false
): string {
  const safeMinor = Math.round(minorUnits);
  const major = safeMinor / 100;
  const symbol = currency === 'PKR' ? 'Rs. ' : `${currency} `;

  const formatted = major.toLocaleString('en-PK', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });

  return `${symbol}${formatted}`;
}

export function calculateDiscountPercent(regularMinor: number, discountMinor?: number): number {
  if (!discountMinor || regularMinor <= 0 || discountMinor >= regularMinor) {
    return 0;
  }
  return Math.round(((regularMinor - discountMinor) / regularMinor) * 100);
}
