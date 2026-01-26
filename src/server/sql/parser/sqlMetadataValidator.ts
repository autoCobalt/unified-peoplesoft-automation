/**
 * SQL Metadata Validator
 *
 * Validates SQL metadata and returns structured issues for UI display.
 *
 * Unlike the lenient parser, the validator is thorough and reports ALL issues
 * so a UI can display them for user correction.
 */

import type {
  SqlMetadata,
  ValidationResult,
  ValidationIssue,
} from '../../../types/sqlMetadata.js';
import { hasMetadataBlock, hasClosedMetadataBlock } from './sqlMetadataParser.js';
import {
  isValidNumberFormat,
  ORACLE_DATE_FORMAT,
} from '../../../utils/formatConverters/index.js';

/* ==============================================
   Validation Constants
   ============================================== */

/** Date format regex (YYYY-MM-DD) */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Semantic version regex (X.Y.Z) */
const VERSION_REGEX = /^\d+\.\d+\.\d+$/;

/** Bind parameter regex (finds :param_name in SQL) */
const BIND_PARAM_REGEX = /:[a-zA-Z_][a-zA-Z0-9_]*/g;

/** Recognized date format names (named aliases) */
const VALID_DATE_FORMAT_NAMES = new Set([
  'oracle-date',
  'DD-MMM-YY',
]);

/** Recognized date format patterns (literal format strings) */
const VALID_DATE_FORMAT_PATTERNS = new Set([
  'DD-MMM-YY',
  'DD-MON-YY', // Oracle alias
]);

/** Oracle data types that should have format specifications */
const DATE_TYPES = new Set(['DATE', 'TIMESTAMP']);

/* ==============================================
   Main Validation Function
   ============================================== */

/**
 * Validate SQL metadata and return structured issues
 *
 * @param content - The raw SQL file content
 * @param filename - The filename for reporting
 * @param metadata - The parsed metadata to validate
 * @returns ValidationResult with all issues found
 */
export function validateSqlMetadata(
  content: string,
  filename: string,
  metadata: SqlMetadata
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // === File-Level Checks ===
  validateMetaBlock(content, issues);

  // === Required Field Checks ===
  validateRequiredFields(filename, metadata, issues);

  // === Date Format Checks ===
  validateDateFields(metadata, issues);

  // === Version Format Check ===
  validateVersionField(metadata, issues);

  // === @returns Section Checks ===
  validateReturnsSection(content, metadata, issues);

  // === @params Section Checks ===
  validateParamsSection(content, metadata, issues);

  // === Build Result ===
  return buildValidationResult(filename, issues, metadata);
}

/* ==============================================
   Individual Validators
   ============================================== */

/**
 * Validate presence and structure of @sql-meta block
 */
function validateMetaBlock(content: string, issues: ValidationIssue[]): void {
  // Check for missing @sql-meta block
  if (!hasMetadataBlock(content)) {
    issues.push({
      code: 'MISSING_META_BLOCK',
      severity: 'warning',
      field: null,
      message: 'No @sql-meta block found. Metadata defaults will be used.',
      suggestion: 'Add a @sql-meta block at the beginning of the file',
    });
    return;
  }

  // Check for unclosed @sql-meta block
  if (!hasClosedMetadataBlock(content)) {
    issues.push({
      code: 'UNCLOSED_META_BLOCK',
      severity: 'error',
      field: null,
      message: '@sql-meta block is not properly closed',
      suggestion: 'Add @end-sql-meta to close the metadata block',
    });
  }
}

/**
 * Validate required fields have meaningful values
 */
function validateRequiredFields(
  filename: string,
  metadata: SqlMetadata,
  issues: ValidationIssue[]
): void {
  const nameFromFile = filename.replace(/\.sql$/i, '');

  // Check if name is just the filename default
  if (metadata.name === nameFromFile) {
    issues.push({
      code: 'MISSING_NAME',
      severity: 'info',
      field: 'name',
      message: 'Name field is using default (filename). Consider adding an explicit name.',
      currentValue: metadata.name,
    });
  }

  // Check for missing description
  if (metadata.description === 'No description') {
    issues.push({
      code: 'MISSING_DESCRIPTION',
      severity: 'warning',
      field: 'description',
      message: 'Description is missing. Add a description to explain what this query does.',
      suggestion: 'Add a "description:" field to the @sql-meta block',
    });
  }
}

/**
 * Validate date fields use correct format
 */
function validateDateFields(metadata: SqlMetadata, issues: ValidationIssue[]): void {
  const dateFields = ['created', 'modified'] as const;

  for (const field of dateFields) {
    const value = metadata[field];
    if (value && !DATE_REGEX.test(value)) {
      issues.push({
        code: 'INVALID_DATE_FORMAT',
        severity: 'error',
        field,
        message: `Invalid date format for "${field}". Expected YYYY-MM-DD.`,
        currentValue: value,
        suggestion: 'Use format: YYYY-MM-DD (e.g., 2025-01-24)',
      });
    }
  }
}

/**
 * Validate version field uses semantic versioning
 */
function validateVersionField(metadata: SqlMetadata, issues: ValidationIssue[]): void {
  if (metadata.version && !VERSION_REGEX.test(metadata.version)) {
    issues.push({
      code: 'INVALID_VERSION_FORMAT',
      severity: 'warning',
      field: 'version',
      message: 'Version should use semantic versioning format.',
      currentValue: metadata.version,
      suggestion: 'Use format: MAJOR.MINOR.PATCH (e.g., 1.0.0)',
    });
  }
}

/**
 * Validate @returns section completeness
 */
function validateReturnsSection(
  content: string,
  metadata: SqlMetadata,
  issues: ValidationIssue[]
): void {
  if (!metadata.returns || metadata.returns.length === 0) {
    // Check if SELECT statement exists but no @returns documented
    if (/\bSELECT\b/i.test(content)) {
      issues.push({
        code: 'MISSING_RETURNS',
        severity: 'info',
        field: 'returns',
        message: 'Query has SELECT but no @returns section. Consider documenting returned columns.',
        suggestion: 'Add an @returns section listing column names and types',
      });
    }
    return;
  }

  // Validate each return column
  for (const col of metadata.returns) {
    if (!col.type) {
      issues.push({
        code: 'MISSING_COLUMN_TYPE',
        severity: 'warning',
        field: 'returns',
        message: `Column "${col.name}" is missing a data type.`,
        suggestion: 'Specify Oracle data type (e.g., VARCHAR2, NUMBER, DATE)',
      });
      continue; // Skip format checks if type is missing
    }

    // Check DATE columns for format specification
    if (DATE_TYPES.has(col.type.toUpperCase()) && !col.format) {
      issues.push({
        code: 'MISSING_DATE_FORMAT',
        severity: 'warning',
        field: 'returns',
        message: `DATE column "${col.name}" has no format specification.`,
        suggestion: `Add format: - ${col.name}: ${col.type} [${ORACLE_DATE_FORMAT}] - description`,
      });
    }

    // Validate format specification if present
    if (col.format) {
      validateColumnFormat(col.name, col.type, col.format, issues);
    }
  }
}

/**
 * Validate a column's format specification
 */
function validateColumnFormat(
  columnName: string,
  columnType: string,
  format: string,
  issues: ValidationIssue[]
): void {
  const upperType = columnType.toUpperCase();

  // Validate DATE format
  if (DATE_TYPES.has(upperType)) {
    if (!VALID_DATE_FORMAT_NAMES.has(format) && !VALID_DATE_FORMAT_PATTERNS.has(format.toUpperCase())) {
      issues.push({
        code: 'UNKNOWN_FORMAT_NAME',
        severity: 'warning',
        field: 'returns',
        message: `Column "${columnName}" has unrecognized date format "${format}".`,
        currentValue: format,
        suggestion: `Use "${ORACLE_DATE_FORMAT}" or "oracle-date" for Oracle date format`,
      });
    }
    return;
  }

  // Validate NUMBER format
  if (upperType === 'NUMBER') {
    if (!isValidNumberFormat(format)) {
      issues.push({
        code: 'UNKNOWN_FORMAT_NAME',
        severity: 'warning',
        field: 'returns',
        message: `Column "${columnName}" has unrecognized number format "${format}".`,
        currentValue: format,
        suggestion: 'Use "integer", "currency", "2dp", "4dp", or "percentage"',
      });
    }
    return;
  }

  // Other types with formats - just informational
  // No validation needed, but could add type-specific format validation in the future
}

/**
 * Validate @params section and cross-check with SQL bind parameters
 */
function validateParamsSection(
  content: string,
  metadata: SqlMetadata,
  issues: ValidationIssue[]
): void {
  // Validate documented params have types
  if (metadata.params) {
    for (const param of metadata.params) {
      if (!param.type) {
        issues.push({
          code: 'MISSING_PARAM_TYPE',
          severity: 'warning',
          field: 'params',
          message: `Parameter "${param.name}" is missing a data type.`,
          suggestion: 'Specify expected type (e.g., NUMBER, STRING, DATE)',
        });
      }
    }
  }

  // Check for bind parameters in SQL not documented
  const bindParamMatches = content.match(BIND_PARAM_REGEX) ?? [];
  const uniqueBindParams = [...new Set(bindParamMatches.map(p => p.slice(1)))];
  const documentedParams = new Set(metadata.params?.map(p => p.name) ?? []);

  for (const param of uniqueBindParams) {
    if (!documentedParams.has(param)) {
      issues.push({
        code: 'UNDOCUMENTED_BIND_PARAM',
        severity: 'warning',
        field: 'params',
        message: `Bind parameter ":${param}" found in SQL but not documented in @params.`,
        suggestion: `Add "${param}" to the @params section with type and description`,
      });
    }
  }
}

/* ==============================================
   Result Builder
   ============================================== */

/**
 * Build the final validation result with summary and recommendations
 */
function buildValidationResult(
  filename: string,
  issues: ValidationIssue[],
  metadata: SqlMetadata
): ValidationResult {
  const summary = {
    errors: issues.filter(i => i.severity === 'error').length,
    warnings: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
  };

  const recommendations: string[] = [];

  if (summary.errors === 0 && summary.warnings === 0) {
    recommendations.push('✓ Metadata is complete and well-formed');
  }

  if (!metadata.author) {
    recommendations.push('Consider adding an author field for attribution');
  }

  if (!metadata.tags || metadata.tags.length === 0) {
    recommendations.push('Consider adding tags for easier searching and categorization');
  }

  if (!metadata.category) {
    recommendations.push('Consider adding a category to group related queries');
  }

  return {
    filename,
    isValid: summary.errors === 0,
    summary,
    issues,
    recommendations,
  };
}
