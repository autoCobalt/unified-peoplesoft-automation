/**
 * Date Format Converter
 *
 * Converts various date formats to Oracle's DD-MMM-YY format.
 *
 * Oracle's default date format is DD-MMM-YY (e.g., 12-APR-23).
 * This utility handles conversion from common user input formats:
 * - MM/DD/YY (e.g., 04/12/23)
 * - MM/DD/YYYY (e.g., 04/12/2023)
 * - DD-MMM-YY (passthrough, e.g., 12-APR-23)
 */

/* ==============================================
   Constants
   ============================================== */

/** Month abbreviations used by Oracle */
const MONTH_ABBREVS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const;

/** Regex to match Oracle DD-MMM-YY format */
const ORACLE_DATE_REGEX =
  /^(\d{2})-(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-(\d{2})$/i;

/** Regex to match MM/DD/YY format */
const SHORT_DATE_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/;

/** Regex to match MM/DD/YYYY format */
const LONG_DATE_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/* ==============================================
   Type Definitions
   ============================================== */

/**
 * Supported input date formats
 */
export type DateInputFormat = 'MM/DD/YY' | 'MM/DD/YYYY' | 'DD-MMM-YY';

/**
 * Result of parsing a date string
 */
export interface ParsedDate {
  day: number;
  month: number;
  year: string; // 2-digit year string
  originalFormat: DateInputFormat;
}

/* ==============================================
   Main Conversion Functions
   ============================================== */

/**
 * Convert various date formats to Oracle's DD-MMM-YY format
 *
 * Accepted inputs:
 * - MM/DD/YY (e.g., '04/12/23' → '12-APR-23')
 * - MM/DD/YYYY (e.g., '04/12/2023' → '12-APR-23')
 * - DD-MMM-YY (passthrough, normalized to uppercase)
 *
 * @param input - Date string in one of the accepted formats
 * @returns Date string in Oracle DD-MMM-YY format (uppercase)
 * @throws Error if input doesn't match any accepted format
 *
 * @example
 * toOracleDate('04/12/23')    // Returns '12-APR-23'
 * toOracleDate('10/05/82')    // Returns '05-OCT-82'
 * toOracleDate('06/08/2001')  // Returns '08-JUN-01'
 * toOracleDate('12-apr-23')   // Returns '12-APR-23'
 */
export function toOracleDate(input: string): string {
  const trimmed = input.trim();

  // Already in Oracle format - normalize case and return
  if (ORACLE_DATE_REGEX.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // MM/DD/YY format
  const shortMatch = SHORT_DATE_REGEX.exec(trimmed);
  if (shortMatch) {
    const [, month, day, year] = shortMatch;
    return formatOracleDate(parseInt(day, 10), parseInt(month, 10), year);
  }

  // MM/DD/YYYY format
  const longMatch = LONG_DATE_REGEX.exec(trimmed);
  if (longMatch) {
    const [, month, day, year] = longMatch;
    return formatOracleDate(
      parseInt(day, 10),
      parseInt(month, 10),
      year.slice(-2)
    );
  }

  throw new Error(
    `Invalid date format: "${input}". Expected MM/DD/YY, MM/DD/YYYY, or DD-MMM-YY.`
  );
}

/**
 * Format day, month, and year into Oracle DD-MMM-YY format
 *
 * @param day - Day of month (1-31)
 * @param month - Month number (1-12)
 * @param year - 2-digit year string
 * @returns Formatted date string
 * @throws Error if month or day is out of range
 */
function formatOracleDate(day: number, month: number, year: string): string {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${String(month)}. Must be 1-12.`);
  }
  if (day < 1 || day > 31) {
    throw new Error(`Invalid day: ${String(day)}. Must be 1-31.`);
  }

  const dd = day.toString().padStart(2, '0');
  const mmm = MONTH_ABBREVS[month - 1];
  const yy = year.padStart(2, '0');

  return `${dd}-${mmm}-${yy}`;
}

/* ==============================================
   Validation Functions
   ============================================== */

/**
 * Check if a string is a valid Oracle DD-MMM-YY date format
 *
 * @param value - String to validate
 * @returns true if valid Oracle date format
 *
 * @example
 * isValidOracleDate('12-APR-23')  // true
 * isValidOracleDate('12-apr-23')  // true (case insensitive)
 * isValidOracleDate('04/12/23')   // false (wrong format)
 */
export function isValidOracleDate(value: string): boolean {
  return ORACLE_DATE_REGEX.test(value.trim());
}

/**
 * Detect the format of a date string
 *
 * @param value - Date string to analyze
 * @returns The detected format, or null if unrecognized
 *
 * @example
 * detectDateFormat('04/12/23')    // 'MM/DD/YY'
 * detectDateFormat('04/12/2023')  // 'MM/DD/YYYY'
 * detectDateFormat('12-APR-23')   // 'DD-MMM-YY'
 * detectDateFormat('invalid')     // null
 */
export function detectDateFormat(value: string): DateInputFormat | null {
  const trimmed = value.trim();

  if (ORACLE_DATE_REGEX.test(trimmed)) {
    return 'DD-MMM-YY';
  }
  if (SHORT_DATE_REGEX.test(trimmed)) {
    return 'MM/DD/YY';
  }
  if (LONG_DATE_REGEX.test(trimmed)) {
    return 'MM/DD/YYYY';
  }

  return null;
}

/**
 * Check if a date string can be converted to Oracle format
 *
 * @param value - Date string to check
 * @returns true if the string can be converted
 *
 * @example
 * canConvertToOracleDate('04/12/23')   // true
 * canConvertToOracleDate('invalid')    // false
 */
export function canConvertToOracleDate(value: string): boolean {
  return detectDateFormat(value) !== null;
}

/* ==============================================
   Parse Functions (for advanced usage)
   ============================================== */

/**
 * Parse a date string into its components
 *
 * @param value - Date string in any supported format
 * @returns Parsed date components
 * @throws Error if format is not recognized
 *
 * @example
 * parseDate('04/12/23')
 * // Returns { day: 12, month: 4, year: '23', originalFormat: 'MM/DD/YY' }
 */
export function parseDate(value: string): ParsedDate {
  const trimmed = value.trim();

  // Oracle format
  const oracleMatch = ORACLE_DATE_REGEX.exec(trimmed);
  if (oracleMatch) {
    const [, day, monthStr, year] = oracleMatch;
    const month =
      MONTH_ABBREVS.indexOf(monthStr.toUpperCase() as (typeof MONTH_ABBREVS)[number]) + 1;
    return {
      day: parseInt(day, 10),
      month,
      year,
      originalFormat: 'DD-MMM-YY',
    };
  }

  // MM/DD/YY format
  const shortMatch = SHORT_DATE_REGEX.exec(trimmed);
  if (shortMatch) {
    const [, month, day, year] = shortMatch;
    return {
      day: parseInt(day, 10),
      month: parseInt(month, 10),
      year,
      originalFormat: 'MM/DD/YY',
    };
  }

  // MM/DD/YYYY format
  const longMatch = LONG_DATE_REGEX.exec(trimmed);
  if (longMatch) {
    const [, month, day, year] = longMatch;
    return {
      day: parseInt(day, 10),
      month: parseInt(month, 10),
      year: year.slice(-2),
      originalFormat: 'MM/DD/YYYY',
    };
  }

  throw new Error(
    `Cannot parse date: "${value}". Expected MM/DD/YY, MM/DD/YYYY, or DD-MMM-YY.`
  );
}

/* ==============================================
   Constants Export (for external use)
   ============================================== */

/**
 * The standard Oracle date format string
 */
export const ORACLE_DATE_FORMAT = 'DD-MMM-YY';

/**
 * Regex for validating Oracle date format (exported for external validation)
 */
export const ORACLE_DATE_PATTERN = ORACLE_DATE_REGEX;
