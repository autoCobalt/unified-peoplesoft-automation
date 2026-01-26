/**
 * Number Format Converter
 *
 * Provides utilities for formatting and validating numeric values
 * for Oracle database operations.
 *
 * Supported formats:
 * - integer: Whole numbers only (rounds decimals)
 * - currency/2dp: 2 decimal places for monetary values
 * - 4dp: 4 decimal places for rates/percentages
 * - percentage: Decimal representation (0.15 = 15%)
 */

/* ==============================================
   Type Definitions
   ============================================== */

/**
 * Standard format definitions for NUMBER columns
 */
export type NumberFormat =
  | 'integer' // Whole numbers only
  | 'currency' // 2 decimal places, e.g., 123.45
  | '2dp' // Alias for currency
  | '4dp' // 4 decimal places (rates, percentages)
  | 'percentage'; // 0-1 scale decimal

/**
 * All recognized number format names (including aliases)
 */
export const NUMBER_FORMAT_NAMES: readonly NumberFormat[] = [
  'integer',
  'currency',
  '2dp',
  '4dp',
  'percentage',
] as const;

/* ==============================================
   Formatting Functions
   ============================================== */

/**
 * Format a number for Oracle based on format specification
 *
 * @param value - The number to format (can be string for parsing)
 * @param format - The target format
 * @returns Formatted string representation
 * @throws Error if value is not a valid number
 *
 * @example
 * formatNumber(1234.567, 'currency')  // '1234.57' (rounds)
 * formatNumber(1234.5, 'integer')     // '1235' (rounds)
 * formatNumber(0.15678, '4dp')        // '0.1568' (rounds)
 */
export function formatNumber(
  value: number | string,
  format: NumberFormat
): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    throw new Error(
      `Invalid number: "${String(value)}". Cannot convert to numeric format.`
    );
  }

  switch (format) {
    case 'integer':
      return Math.round(num).toString();
    case 'currency':
    case '2dp':
      return num.toFixed(2);
    case '4dp':
      return num.toFixed(4);
    case 'percentage':
      // Assume input is decimal (0.15 = 15%), output as 4 decimal places
      return num.toFixed(4);
    default: {
      // Type-safe exhaustiveness check
      const _exhaustive: never = format;
      return String(_exhaustive);
    }
  }
}

/**
 * Format a number for display with thousands separators
 *
 * @param value - The number to format
 * @param format - The numeric format for decimal places
 * @returns Formatted string with commas (e.g., "1,234.56")
 *
 * @example
 * formatNumberDisplay(1234567.89, 'currency')  // '1,234,567.89'
 * formatNumberDisplay(1234567, 'integer')       // '1,234,567'
 */
export function formatNumberDisplay(
  value: number | string,
  format: NumberFormat
): string {
  const formatted = formatNumber(value, format);
  const num = parseFloat(formatted);

  // Use locale formatting for display
  switch (format) {
    case 'integer':
      return num.toLocaleString('en-US', {
        maximumFractionDigits: 0,
      });
    case 'currency':
    case '2dp':
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    case '4dp':
    case 'percentage':
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      });
    default: {
      const _exhaustive: never = format;
      return String(_exhaustive);
    }
  }
}

/* ==============================================
   Parsing Functions
   ============================================== */

/**
 * Parse user input for currency fields
 *
 * Handles common currency input formats:
 * - $1,234.56 → 1234.56
 * - 1,234.56 → 1234.56
 * - 1234.56 → 1234.56
 * - (1,234.56) → -1234.56 (accounting negative)
 *
 * @param input - User-entered currency string
 * @returns Parsed numeric value
 * @throws Error if input cannot be parsed as a number
 *
 * @example
 * parseCurrencyInput('$1,234.56')   // 1234.56
 * parseCurrencyInput('1,234.56')    // 1234.56
 * parseCurrencyInput('(500.00)')    // -500
 */
export function parseCurrencyInput(input: string): number {
  const trimmed = input.trim();

  // Check for accounting-style negative: (1,234.56)
  const isAccountingNegative = trimmed.startsWith('(') && trimmed.endsWith(')');

  // Remove currency symbols, commas, whitespace, parentheses
  const cleaned = trimmed.replace(/[$,\s()]/g, '');

  const num = parseFloat(cleaned);

  if (isNaN(num)) {
    throw new Error(
      `Invalid currency value: "${input}". Expected numeric format like "$1,234.56".`
    );
  }

  return isAccountingNegative ? -num : num;
}

/**
 * Parse percentage input (accepts both decimal and whole number formats)
 *
 * @param input - User-entered percentage string
 * @param inputAs - Whether input is 'decimal' (0.15) or 'whole' (15%)
 * @returns Decimal representation (0.15 for 15%)
 * @throws Error if input cannot be parsed
 *
 * @example
 * parsePercentageInput('15%', 'whole')   // 0.15
 * parsePercentageInput('15', 'whole')    // 0.15
 * parsePercentageInput('0.15', 'decimal') // 0.15
 */
export function parsePercentageInput(
  input: string,
  inputAs: 'decimal' | 'whole' = 'whole'
): number {
  // Remove % sign if present
  const cleaned = input.trim().replace(/%/g, '');
  const num = parseFloat(cleaned);

  if (isNaN(num)) {
    throw new Error(
      `Invalid percentage value: "${input}". Expected numeric format like "15%" or "0.15".`
    );
  }

  // Convert whole number to decimal if needed
  return inputAs === 'whole' ? num / 100 : num;
}

/* ==============================================
   Validation Functions
   ============================================== */

/**
 * Validate that a number matches the expected format
 *
 * @param value - Number to validate
 * @param format - Expected format
 * @returns true if the value conforms to the format
 *
 * @example
 * validateNumberFormat(123.45, 'currency')   // true (2 decimal places)
 * validateNumberFormat(123.456, 'currency')  // false (3 decimal places)
 * validateNumberFormat(123, 'integer')       // true
 * validateNumberFormat(123.5, 'integer')     // false
 */
export function validateNumberFormat(
  value: number,
  format: NumberFormat
): boolean {
  switch (format) {
    case 'integer':
      return Number.isInteger(value);
    case 'currency':
    case '2dp':
      return countDecimalPlaces(value) <= 2;
    case '4dp':
    case 'percentage':
      return countDecimalPlaces(value) <= 4;
    default: {
      const _exhaustive: never = format;
      return Boolean(_exhaustive);
    }
  }
}

/**
 * Check if a string represents a recognized number format name
 *
 * @param format - String to check
 * @returns true if it's a valid NumberFormat
 */
export function isValidNumberFormat(format: string): format is NumberFormat {
  return NUMBER_FORMAT_NAMES.includes(format as NumberFormat);
}

/* ==============================================
   Helper Functions
   ============================================== */

/**
 * Count the number of decimal places in a number
 *
 * @param num - Number to analyze
 * @returns Number of decimal places (0 for integers)
 *
 * @example
 * countDecimalPlaces(123)      // 0
 * countDecimalPlaces(123.45)   // 2
 * countDecimalPlaces(123.4500) // 2 (trailing zeros don't count)
 */
export function countDecimalPlaces(num: number): number {
  // Handle edge cases
  if (!Number.isFinite(num)) {
    return 0;
  }

  // Convert to string and find decimal point
  const str = num.toString();

  // Handle scientific notation
  if (str.includes('e')) {
    const [mantissa, exponent] = str.split('e');
    const exp = parseInt(exponent, 10);
    const mantissaDecimals = mantissa.includes('.')
      ? mantissa.split('.')[1].length
      : 0;
    // Negative exponent increases decimals, positive decreases
    return Math.max(0, mantissaDecimals - exp);
  }

  const decimalIndex = str.indexOf('.');
  return decimalIndex === -1 ? 0 : str.length - decimalIndex - 1;
}

/**
 * Get the maximum decimal places allowed for a format
 *
 * @param format - The number format
 * @returns Maximum decimal places
 */
export function getMaxDecimalPlaces(format: NumberFormat): number {
  switch (format) {
    case 'integer':
      return 0;
    case 'currency':
    case '2dp':
      return 2;
    case '4dp':
    case 'percentage':
      return 4;
    default: {
      const _exhaustive: never = format;
      return Number(_exhaustive);
    }
  }
}
