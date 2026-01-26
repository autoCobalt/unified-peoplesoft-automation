/**
 * Format Converters Module
 *
 * Provides utilities for converting and validating data formats
 * for Oracle database operations.
 *
 * @module formatConverters
 *
 * @example
 * import { toOracleDate, formatNumber } from '@/utils/formatConverters';
 *
 * // Convert user date input to Oracle format
 * const oracleDate = toOracleDate('04/12/23');  // '12-APR-23'
 *
 * // Format currency for Oracle
 * const amount = formatNumber(1234.567, 'currency');  // '1234.57'
 */

// Date format utilities
export {
  toOracleDate,
  isValidOracleDate,
  detectDateFormat,
  canConvertToOracleDate,
  parseDate,
  ORACLE_DATE_FORMAT,
  ORACLE_DATE_PATTERN,
  type DateInputFormat,
  type ParsedDate,
} from './dateFormatConverter.js';

// Number format utilities
export {
  formatNumber,
  formatNumberDisplay,
  parseCurrencyInput,
  parsePercentageInput,
  validateNumberFormat,
  isValidNumberFormat,
  countDecimalPlaces,
  getMaxDecimalPlaces,
  NUMBER_FORMAT_NAMES,
  type NumberFormat,
} from './numberFormatConverter.js';
