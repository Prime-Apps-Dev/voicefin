/**
 * Safely formats a number as a currency string.
 * Prevents "RangeError: invalid currency code" crashes.
 * 
 * @param amount - The number to format.
 * @param currency - The currency code (e.g., 'USD', 'EUR').
 * @param locale - Optional locale (defaults to 'en-US' or browser default).
 * @returns Formatted string (e.g., "$1,234.56") or fallback.
 */
export const formatMoney = (
  amount: number | null | undefined,
  currency: string | null | undefined,
  locale: string = 'en-US',
  options?: Intl.NumberFormatOptions
): string => {
  // 1. Handle invalid amount
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0.00';
  }

  // 2. Validate currency code
  let safeCurrency = currency;
  
  // Basic validation: must be a string and 3 chars long
  if (!safeCurrency || typeof safeCurrency !== 'string' || safeCurrency.length !== 3) {
    console.warn(`formatMoney: Invalid currency code "${currency}". Falling back to USD.`);
    safeCurrency = 'USD';
  }

  try {
    // 3. Attempt formatting
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options,
    }).format(amount);
  } catch (error) {
    // 4. Fallback if Intl crashes (e.g., unknown currency code like 'XYZ')
    console.error(`formatMoney: Error formatting ${amount} with currency "${safeCurrency}".`, error);
    
    // Fallback: Just display the number with 2 decimals
    return amount.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
};
